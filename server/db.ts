import "dotenv/config";
import { readFile } from "node:fs/promises";
import type { UIMessage } from "ai";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
});

export async function migrate() {
  await pool.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}

export async function saveConversation(id: string, messages: UIMessage[]) {
  const first = messages.find((message) => message.role === "user");
  const title =
    first?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .slice(0, 80) || "New conversation";
  await pool.query(
    `INSERT INTO conversations (id, title, messages) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (id) DO UPDATE SET messages = EXCLUDED.messages, updated_at = now()`,
    [id, title, JSON.stringify(messages)],
  );
}

export async function loadConversation(
  id: string,
): Promise<UIMessage[] | undefined> {
  const result = await pool.query(
    "SELECT messages FROM conversations WHERE id = $1",
    [id],
  );
  return result.rows[0]?.messages;
}

export async function saveDocument(
  conversationId: string,
  name: string,
  content: string,
) {
  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO documents (id, name, content, metadata) VALUES ($1, $2, $3, $4::jsonb)",
    [id, name, content, JSON.stringify({ conversationId })],
  );
  return id;
}

export async function loadDocument(
  id: string,
  conversationId: string,
): Promise<{ name: string; content: string } | undefined> {
  const result = await pool.query(
    "SELECT name, content FROM documents WHERE id = $1 AND metadata->>'conversationId' = $2",
    [id, conversationId],
  );
  return result.rows[0];
}
