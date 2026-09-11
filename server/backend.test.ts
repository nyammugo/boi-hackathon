import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { BuildpromptBackend } from "./backend";

const directory = await mkdtemp(join(tmpdir(), "plainly-backend-"));
const cookies: (string | undefined)[] = [];
const requests: unknown[] = [];
const server = createServer(async (req, res) => {
  cookies.push(req.headers.cookie);
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
  assert.deepEqual(requests.at(-1), { messages });
  assert.equal(cookies.at(-1), "wos-session=initial");
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
