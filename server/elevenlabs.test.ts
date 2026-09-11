import assert from "node:assert/strict";
import { test } from "node:test";
import { ElevenLabsAgent } from "./elevenlabs";

test("signs only the configured agent and keeps the key in server request headers", async () => {
  const agent = new ElevenLabsAgent(
    "test-secret",
    "agent_one",
    async (input, init) => {
      assert.equal(
        String(input),
        "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent_one",
      );
      assert.equal(new Headers(init?.headers).get("xi-api-key"), "test-secret");
      assert.equal(init?.redirect, "error");
      return Response.json({
        signed_url:
          "wss://api.elevenlabs.io/v1/convai/conversation?signed=temporary",
      });
    },
  );
  const url = await agent.signedUrl(new AbortController().signal);
  assert.ok(url.startsWith("wss://api.elevenlabs.io/"));
  assert.ok(!url.includes("test-secret"));
});

test("agent info exposes only display fields", async () => {
  const agent = new ElevenLabsAgent("test-secret", "agent_one", async () =>
    Response.json({
      name: "Ireland Demo",
      private_setting: "hidden",
      conversation_config: {
        agent: { prompt: { llm: "qwen", prompt: "private prompt" } },
      },
    }),
  );
  assert.deepEqual(await agent.info(), {
    available: true,
    name: "Ireland Demo",
    model: "qwen",
  });
});

test("missing configuration cannot call ElevenLabs", async () => {
  const agent = new ElevenLabsAgent("", "", async () => {
    throw new Error("Must not call provider");
  });
  await assert.rejects(agent.info(), /not configured/);
});

test("rejects unexpected signed URL hosts and protocols", async () => {
  for (const url of [
    "wss://example.com/",
    "https://api.elevenlabs.io/",
    "wss://api.elevenlabs.io.attacker.example/",
  ]) {
    const agent = new ElevenLabsAgent("test-secret", "agent_one", async () =>
      Response.json({ signed_url: url }),
    );
    await assert.rejects(
      agent.signedUrl(new AbortController().signal),
      /invalid connection URL/,
    );
  }
});

test("provider errors do not expose response bodies or keys", async () => {
  for (const status of [401, 403, 429, 500]) {
    const agent = new ElevenLabsAgent(
      "test-secret",
      "agent_one",
      async () => new Response("private provider detail", { status }),
    );
    await assert.rejects(
      agent.info(),
      (error: Error) =>
        !error.message.includes("private") &&
        !error.message.includes("test-secret"),
    );
  }
});

test("cancellation reaches the upstream request", async () => {
  const controller = new AbortController();
  const agent = new ElevenLabsAgent(
    "test-secret",
    "agent_one",
    async (_input, init) => {
      controller.abort();
      assert.equal(init?.signal?.aborted, true);
      throw new DOMException("Aborted", "AbortError");
    },
  );
  await assert.rejects(agent.signedUrl(controller.signal), /Aborted/);
});
