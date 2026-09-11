import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { after, before, test } from "node:test";
import type { UIMessage } from "ai";

// Set before importing the app: integration tests never call the AI provider.
process.env.DEMO_MODE = "true";
const { app } = await import("./app");
const { migrate, pool, loadConversation, saveConversation } = await import(
  "./db"
);
const { textOf } = await import("./chat");
const ids: string[] = [];
const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string")
  throw new Error("Missing test server address");
const base = `http://127.0.0.1:${address.port}`;

function testId() {
  const id = randomUUID();
  ids.push(id);
  return id;
}
function question(text = "Explain compound interest."): UIMessage {
  return { id: randomUUID(), role: "user", parts: [{ type: "text", text }] };
}
function post(body: unknown) {
  return fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
before(async () => {
  await migrate();
});
after(async () => {
  await pool.query("DELETE FROM conversations WHERE id = ANY($1::uuid[])", [
    ids,
  ]);
  await pool.query(
    "DELETE FROM documents WHERE metadata->>'conversationId' = ANY($1::text[])",
    [ids],
  );
  await pool.end();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test("health reports real Postgres and demo mode", async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const health = (await response.json()) as { mode: string };
  assert.equal(health.mode, "demo");
});

test("source routes return an empty list in demo mode and reject unavailable documents", async () => {
  const response = await fetch(`${base}/api/sources`);
  assert.deepEqual(await response.json(), []);
  assert.equal((await fetch(`${base}/api/sources/not-a-uuid`)).status, 400);
  assert.equal(
    (await fetch(`${base}/api/sources/${randomUUID()}`)).status,
    404,
  );
});

test("streams and persists a chat, then simplifies an older saved answer without replacing it", async () => {
  const id = testId();
  const response = await post({ id, messages: [question()] });
  assert.equal(response.status, 200);
  assert.ok(
    response.headers.get("content-type")?.includes("text/event-stream"),
  );
  const stream = await response.text();
  assert.ok(stream.includes("text-delta"));
  assert.ok(stream.includes("[DONE]"));
  const messages = await loadConversation(id);
  assert.equal(messages?.length, 2);
  assert.ok(messages);
  const original = structuredClone(messages[1]);
  assert.ok(textOf(original).includes("€110.25"));
  const later: UIMessage = {
    id: randomUUID(),
    role: "assistant",
    parts: [
      { type: "text", text: "This is a later, unrelated answer about trees." },
    ],
  };
  const history = [...messages, question("Tell me about trees."), later];
  await saveConversation(id, history);
  const simplify = {
    ...question("Make this answer easier to understand."),
    metadata: { simplifyMessageId: original.id },
  };
  const simplified = await post({ id, messages: [...history, simplify] });
  assert.equal(simplified.status, 200);
  await simplified.text();
  const saved = await loadConversation(id);
  assert.equal(saved?.length, 6);
  assert.deepEqual(saved?.[1], original);
  assert.deepEqual(saved?.[3], later);
  assert.ok(saved && textOf(saved[5]).includes("simple version"));
  const reloaded = await fetch(`${base}/api/conversations/${id}`);
  const reloadedChat = (await reloaded.json()) as { messages: UIMessage[] };
  assert.deepEqual(reloadedChat.messages, saved);
  const list = await fetch(`${base}/api/conversations`);
  const historyList = (await list.json()) as { id: string }[];
  assert.ok(historyList.some((chat) => chat.id === id));
});

test("rejects malformed, blank and unsupported requests without saving", async () => {
  const id = testId();
  assert.equal((await post({ id, messages: [question("  ")] })).status, 400);
  assert.equal(
    (await post({ id, messages: [{ ...question(), role: "system" }] })).status,
    400,
  );
  assert.equal((await post({ id, messages: [] })).status, 400);
  assert.equal(await loadConversation(id), undefined);
  assert.equal(
    (await fetch(`${base}/api/conversations/not-a-uuid`)).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/conversations/${randomUUID()}`)).status,
    404,
  );
});

test("cannot simplify an answer from another conversation and releases the chat lock after rejection", async () => {
  const first = testId();
  const second = testId();
  const answer: UIMessage = {
    id: randomUUID(),
    role: "assistant",
    parts: [{ type: "text", text: "Answer from another chat." }],
  };
  await saveConversation(first, [question(), answer]);
  const invalid = {
    id: second,
    messages: [{ ...question(), metadata: { simplifyMessageId: answer.id } }],
  };
  assert.equal((await post(invalid)).status, 400);
  assert.equal((await post(invalid)).status, 400);
  assert.equal(await loadConversation(second), undefined);
});

test("rejects concurrent writes to the same chat", async () => {
  const id = testId();
  const body = { id, messages: [question()] };
  const first = await post(body);
  assert.equal(first.status, 200);
  const second = await post(body);
  assert.equal(second.status, 409);
  await first.text();
  assert.equal((await loadConversation(id))?.length, 2);
});

test("uploads a letter, keeps it on reload and rejects cross-conversation access", async () => {
  const id = testId();
  const content = "Please pay €125 by 30 September 2026.";
  const upload = await fetch(
    `${base}/api/documents?${new URLSearchParams({ conversationId: id, name: "letter.txt" })}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: content,
    },
  );
  assert.equal(upload.status, 200);
  const document = (await upload.json()) as { id: string; name: string };
  const message = {
    ...question(`Explain this letter: ${document.name}`),
    metadata: { documentId: document.id },
  };
  const response = await post({ id, messages: [message] });
  assert.equal(response.status, 200);
  await response.text();
  const reload = await fetch(`${base}/api/conversations/${id}`);
  const saved = (await reload.json()) as { messages: UIMessage[] };
  assert.deepEqual(saved.messages[0].metadata, { documentId: document.id });
  assert.ok(textOf(saved.messages[1]).includes("Demo mode cannot explain"));
  const { loadDocument } = await import("./db");
  assert.deepEqual(await loadDocument(document.id, id), {
    name: "letter.txt",
    content,
  });
  const followup = await post({
    id,
    messages: [...saved.messages, question("When is it due?")],
  });
  assert.equal(followup.status, 200);
  await followup.text();
  const other = testId();
  assert.equal((await post({ id: other, messages: [message] })).status, 400);
  assert.equal(await loadConversation(other), undefined);
  assert.equal(
    (
      await post({
        id: other,
        messages: [{ ...message, metadata: { documentId: randomUUID() } }],
      })
    ).status,
    400,
  );
});

test("upload endpoint rejects unsupported files and invalid conversations", async () => {
  const id = testId();
  for (const [conversationId, name, body] of [
    [id, "letter.png", "image"],
    ["invalid", "letter.txt", "hello"],
    [id, "letter.txt", ""],
  ]) {
    const response = await fetch(
      `${base}/api/documents?${new URLSearchParams({ conversationId, name })}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body,
      },
    );
    assert.equal(response.status, 400);
  }
});

test("server verification matches sample text, survives reload, and ignores client verdicts", async () => {
  const { readFile } = await import("node:fs/promises");
  const id = testId();
  for (const [name, expected] of [
    ["sample-letter-with-code.pdf", "matched"],
    ["sample-letter-without-code.pdf", "missing"],
  ]) {
    const upload = await fetch(
      `${base}/api/documents?${new URLSearchParams({ conversationId: id, name })}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: await readFile(new URL(`./fixtures/${name}`, import.meta.url)),
      },
    );
    assert.equal(upload.status, 200);
    const data = (await upload.json()) as {
      id: string;
      verification: { status: string };
    };
    assert.equal(data.verification.status, expected);
    const response = await post({
      id,
      messages: [
        {
          ...question(`Explain this letter: ${name}`),
          metadata: {
            documentId: data.id,
            verification: { status: "matched" },
          },
        },
      ],
    });
    assert.equal(response.status, 200);
    await response.text();
    const saved = await loadConversation(id);
    assert.deepEqual(saved?.[0].metadata, { documentId: data.id });
    const check = await fetch(
      `${base}/api/documents/${data.id}/verification?conversationId=${id}`,
    );
    assert.equal(check.status, 200);
    assert.equal(((await check.json()) as { status: string }).status, expected);
    const other = await fetch(
      `${base}/api/documents/${data.id}/verification?conversationId=${testId()}`,
    );
    assert.equal(other.status, 404);
  }
  assert.equal(
    (
      await fetch(
        `${base}/api/documents/invalid/verification?conversationId=${id}`,
      )
    ).status,
    400,
  );
});
