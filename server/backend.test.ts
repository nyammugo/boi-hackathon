import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import type { UIMessage } from "ai";
import { BuildpromptBackend } from "./backend";
import { plainLanguagePrompt, simplificationPrompt, textOf } from "./chat";

const directory = await mkdtemp(join(tmpdir(), "plainly-backend-"));
const cookies: (string | undefined)[] = [];
const requests: unknown[] = [];
const sourceId = "fc8c7b70-93e5-440f-9d32-d5c6080a1d13";
const nextSourceId = "e10a707b-ca4f-4623-95ec-16d9cc5c1d1b";
const server = createServer(async (req, res) => {
  cookies.push(req.headers.cookie);
  if (req.url?.startsWith("/api/trpc/sources.getCollection?")) {
    const input = JSON.parse(
      new URL(req.url, "http://localhost").searchParams.get("input") || "{}",
    ).json;
    assert.equal(input.id, "boi");
    res.writeHead(200, { "content-type": "application/json" }).end(
      JSON.stringify({
        result: {
          data: {
            json: {
              files:
                input.page === 1
                  ? [
                      { id: sourceId, name: "terms.md", status: "ready" },
                      {
                        id: "89539f41-5282-4d98-9eb3-f25675f0d9c2",
                        name: "pending.md",
                        status: "processing",
                      },
                    ]
                  : [
                      {
                        id: nextSourceId,
                        name: "overview.md",
                        status: "ready",
                      },
                    ],
              pagination: { totalPages: 2 },
            },
          },
        },
      }),
    );
    return;
  }
  if (req.url === `/api/files/${sourceId}`) {
    res
      .writeHead(200, { "content-type": "text/markdown" })
      .end("# Actual source document");
    return;
  }
  if (req.url === "/api/rejected") {
    res.writeHead(401).end("private upstream details");
    return;
  }
  if (req.url === "/api/redirect") {
    res.writeHead(302, { location: "https://example.com/" }).end();
    return;
  }
  if (req.url === "/api/renew") {
    res
      .writeHead(200, { "set-cookie": "wos-session=rotated; Path=/; HttpOnly" })
      .end("{}");
    return;
  }
  if (req.url === "/api/chat") {
    let body = "";
    for await (const part of req) body += part;
    requests.push(JSON.parse(body));
    res.writeHead(200, { "content-type": "text/event-stream" });
    for (const event of [
      { type: "start", messageId: "from-backend" },
      {
        type: "data-heartbeat",
        data: { timestamp: Date.now() },
        transient: true,
      },
      { type: "text-start", id: "text" },
      {
        type: "text-delta",
        id: "text",
        delta: "An answer grounded in BOI documents.",
      },
      { type: "text-end", id: "text" },
      { type: "finish" },
    ])
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    res.end("data: [DONE]\n\n");
    return;
  }
  const data = req.url?.endsWith("modelDefaults.get")
    ? {
        effectivePromptingDefaultEndpointId: "sonnet-id",
        effectivePromptingDefaultEndpointName: "boi-claude-sonnet-5",
      }
    : req.url?.endsWith("sourceDefaults.getSettings")
      ? { collectionIds: ["boi"] }
      : [
          { id: "boi", name: "BOI Documents", sourceCount: 4 },
          { id: "other", name: "Unselected", sourceCount: 9 },
        ];
  res
    .writeHead(200, { "content-type": "application/json" })
    .end(JSON.stringify({ result: { data: { json: data } } }));
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Missing test server address");
const origin = `http://127.0.0.1:${address.port}`;

async function client(
  name: string,
  expiresAt = new Date(Date.now() + 60000).toISOString(),
) {
  const file = join(directory, `${name}.json`);
  await writeFile(
    file,
    JSON.stringify({
      origin,
      cookie: "wos-session=initial",
      expiresAt,
      workosUserId: "test-user",
    }),
  );
  return { backend: new BuildpromptBackend(origin, file), file };
}

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(directory, { recursive: true, force: true });
});

test("forwards chat to the backend, preserving streaming without creating a remote thread", async () => {
  const { backend } = await client("stream");
  const messages = [
    {
      id: "question",
      role: "user" as const,
      parts: [{ type: "text" as const, text: "Summarise the sources." }],
    },
  ];
  const stream = await backend.stream(messages, new AbortController().signal);
  const reader = stream.getReader();
  const events = [];
  for (;;) {
    const item = await reader.read();
    if (item.done) break;
    events.push(item.value);
  }
  assert.ok(
    events.some(
      (event) => event.type === "text-delta" && event.delta.includes("BOI"),
    ),
  );
  assert.deepEqual(requests.at(-1), {
    messages: [
      {
        ...messages[0],
        parts: [
          ...messages[0].parts,
          { type: "text", text: plainLanguagePrompt },
        ],
      },
    ],
  });
  assert.deepEqual(messages[0].parts, [
    { type: "text", text: "Summarise the sources." },
  ]);
  assert.equal(cookies.at(-1), "wos-session=initial");
});

test("sends the selected older answer and writing guidance when simplifying without changing history", async () => {
  const { backend } = await client("simplify");
  const source: UIMessage = {
    id: "older-answer",
    role: "assistant",
    parts: [
      { type: "text", text: "€100 becomes €105 at 5%." },
      { type: "text", text: "This assumes no fees or taxes." },
    ],
  };
  const messages: UIMessage[] = [
    {
      id: "question",
      role: "user",
      parts: [{ type: "text", text: "Explain interest." }],
    },
    source,
    {
      id: "later-question",
      role: "user",
      parts: [{ type: "text", text: "What are trees?" }],
    },
    {
      id: "later-answer",
      role: "assistant",
      parts: [{ type: "text", text: "Trees are plants." }],
    },
    {
      id: "simplify",
      role: "user",
      metadata: { simplifyMessageId: source.id },
      parts: [{ type: "text", text: simplificationPrompt(source) }],
    },
  ];
  const original = structuredClone(messages);
  const stream = await backend.stream(messages, new AbortController().signal);
  await stream.pipeTo(new WritableStream({ write() {} }));
  const sent = requests.at(-1) as { messages: UIMessage[] };
  assert.deepEqual(sent.messages.slice(0, -1), original.slice(0, -1));
  const request = sent.messages.at(-1);
  assert.ok(request);
  const rewrite = textOf(request);
  assert.ok(rewrite.includes(`<answer>\n${textOf(source)}\n</answer>`));
  assert.ok(rewrite.includes(plainLanguagePrompt));
  assert.ok(!rewrite.includes("Trees are plants."));
  assert.deepEqual(messages, original);
});

test("reports only default source collections and verifies the Sonnet 5 default", async () => {
  const { backend } = await client("info");
  assert.deepEqual(await backend.info(), {
    model: "boi-claude-sonnet-5",
    origin,
    collections: ["BOI Documents"],
    documentCount: 4,
  });
});

test("lists ready source documents from every page in the selected collections", async () => {
  const { backend } = await client("source-list");
  assert.deepEqual(await backend.sourceFiles(), [
    { id: sourceId, name: "terms.md" },
    { id: nextSourceId, name: "overview.md" },
  ]);
});

test("opens actual selected documents and rejects invalid or unselected IDs", async () => {
  const { backend } = await client("source-download");
  const source = await backend.sourceFile(sourceId);
  assert.equal(source?.file.name, "terms.md");
  assert.equal(await source?.response.text(), "# Actual source document");
  const before = cookies.length;
  assert.equal(await backend.sourceFile("../private"), undefined);
  assert.equal(cookies.length, before);
  assert.equal(
    await backend.sourceFile("89539f41-5282-4d98-9eb3-f25675f0d9c2"),
    undefined,
  );
});

test("stores rotated session cookies before starting the next request", async () => {
  const { backend, file } = await client("rotation");
  await Promise.all([
    backend.request("/api/renew"),
    backend.request("/api/check"),
  ]);
  assert.equal(cookies.at(-1), "wos-session=rotated");
  assert.equal(
    JSON.parse(await readFile(file, "utf8")).cookie,
    "wos-session=rotated",
  );
});

test("uses app-selected collections for both chat and health without changing shared defaults", async () => {
  const { file } = await client("selection");
  const backend = new BuildpromptBackend(origin, file, ["other"]);
  const info = await backend.info();
  assert.deepEqual(info.collections, ["Unselected"]);
  assert.equal(info.documentCount, 9);
  const stream = await backend.stream([], new AbortController().signal);
  for await (const _event of stream) {
    /* Consume the response. */
  }
  assert.deepEqual(requests.at(-1), {
    messages: [],
    sourceSelection: { collections: ["other"], files: [] },
  });
});

test("reports an unavailable configured collection instead of silently omitting it", async () => {
  const { file } = await client("missing-selection");
  const backend = new BuildpromptBackend(origin, file, ["missing"]);
  await assert.rejects(backend.info(), /collection is unavailable/);
});

test("blocks expired sessions and cross-origin requests before sending credentials", async () => {
  const { backend } = await client("expired", "2000-01-01T00:00:00Z");
  const before = cookies.length;
  await assert.rejects(backend.request("/api/check"), /expired/);
  await assert.rejects(
    backend.request("https://example.com/api/chat"),
    /Invalid backend route/,
  );
  assert.equal(cookies.length, before);
});

test("does not follow redirects or expose backend authentication error details", async () => {
  const { backend } = await client("errors");
  await assert.rejects(
    backend.request("/api/rejected"),
    /session was rejected/,
  );
  await assert.rejects(backend.request("/api/redirect"), /HTTP 302/);
});
