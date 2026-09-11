import assert from "node:assert/strict";
import { once } from "node:events";
import { after, test } from "node:test";
import { app } from "./app";
import { pool } from "./db";
import { createSpeech } from "./speech";

const fetchLocal = globalThis.fetch;
const previousKey = process.env.ELEVENLABS_API_KEY;
process.env.ELEVENLABS_API_KEY = "test-speech-key";
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Missing test server address");
const base = `http://127.0.0.1:${address.port}`;

function responseFor(text: string) {
  const characters = Array.from(text);
  return {
    audio_base64: "SUQz",
    alignment: {
      characters,
      character_start_times_seconds: characters.map((_, index) => index / 10),
      character_end_times_seconds: characters.map(
        (_, index) => (index + 1) / 10,
      ),
    },
  };
}
function post(body: unknown) {
  return fetchLocal(`${base}/api/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
after(async () => {
  if (previousKey === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = previousKey;
  await pool.end();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("proxies speech with server credentials and maps Unicode timing to DOM offsets", async (t) => {
  const text = "Save 💶 €1,000 at 3.5%.";
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.ok(url.startsWith("https://api.elevenlabs.io/v1/text-to-speech/"));
    assert.ok(url.includes("/with-timestamps?output_format=mp3_44100_128"));
    assert.equal(
      new Headers(init.headers).get("xi-api-key"),
      "test-speech-key",
    );
    assert.equal(init.redirect, "error");
    assert.deepEqual(JSON.parse(String(init.body)), {
      text,
      model_id: "eleven_flash_v2_5",
    });
    return Response.json(responseFor(text));
  });
  const response = await post({ text });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const data = await response.json();
  assert.equal(data.audioBase64, "SUQz");
  assert.deepEqual(data.words[1], {
    start: 5,
    end: 7,
    startTime: 0.5,
    endTime: 0.6,
  });
  assert.deepEqual(
    data.words.map((word: { start: number; end: number }) =>
      text.slice(word.start, word.end),
    ),
    ["Save", "💶", "€1,000", "at", "3.5%."],
  );
  assert.ok(!JSON.stringify(data).includes("test-speech-key"));
});

test("rejects invalid text before contacting ElevenLabs", async (t) => {
  const provider = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected provider call");
  });
  for (const body of [
    {},
    { text: " \n " },
    { text: 12 },
    { text: "a".repeat(20001) },
  ])
    assert.equal((await post(body)).status, 400);
  assert.equal(provider.mock.callCount(), 0);
});

test("reports missing configuration without contacting ElevenLabs", async (t) => {
  delete process.env.ELEVENLABS_API_KEY;
  t.after(() => {
    process.env.ELEVENLABS_API_KEY = "test-speech-key";
  });
  const provider = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected provider call");
  });
  const response = await post({ text: "Read this." });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /API key/);
  assert.equal(provider.mock.callCount(), 0);
});

test("reports rejected access and quota errors without leaking provider details", async (t) => {
  let status = 401;
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { detail: "private provider details test-speech-key" },
      { status },
    ),
  );
  for (status of [401, 403, 429, 500]) {
    const response = await post({ text: "Read this." });
    assert.equal(
      response.status,
      status === 429 ? 429 : status === 500 ? 502 : 503,
    );
    const body = await response.text();
    assert.ok(!body.includes("private provider details"));
    assert.ok(!body.includes("test-speech-key"));
  }
});

test("rejects absent or mismatched timing instead of highlighting the wrong text", async (t) => {
  const text = "Hello.";
  let data: unknown;
  t.mock.method(globalThis, "fetch", async () => Response.json(data));
  const missingTimes = responseFor(text);
  missingTimes.alignment.character_start_times_seconds.pop();
  const backwards = responseFor(text);
  backwards.alignment.character_start_times_seconds[1] = 9;
  for (data of [
    { audio_base64: "SUQz" },
    responseFor("Other text."),
    missingTimes,
    backwards,
  ])
    assert.equal((await post({ text })).status, 502);
});

test("propagates cancellation to the provider request", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.ok(init.signal?.aborted);
      init.signal.throwIfAborted();
      throw new Error("Expected abort");
    },
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(createSpeech("Read this.", controller.signal), {
    name: "AbortError",
  });
});
