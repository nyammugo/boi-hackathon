import { randomUUID } from "node:crypto";
import {
  convertToModelMessages,
  createUIMessageStream,
  pipeUIMessageStreamToResponse,
  streamText,
  type UIMessage,
} from "ai";
import express from "express";
import { z } from "zod";
import { BackendError, backend } from "./backend";
import {
  chatRequest,
  demoAnswer,
  simplificationPrompt,
  systemPrompt,
  textOf,
} from "./chat";
import {
  loadConversation,
  loadDocument,
  pool,
  saveConversation,
  saveDocument,
} from "./db";
import { DocumentError, extractDocument, letterPrompt } from "./documents";
import { accessExpired, demoMode, getModel, modelName } from "./model";

import { verifyLetter } from "./verification";

export const app = express();
const activeChats = new Set<string>();
const streamError = (error: unknown) =>
  error instanceof BackendError
    ? error.message
    : backend
      ? "Could not complete the answer through BOI staging. Check the server session and connection, then retry."
      : "Could not complete the answer. Check your AI key, model access and connection, then retry.";
app.disable("x-powered-by");
app.post(
  "/api/documents",
  express.raw({ type: "application/octet-stream", limit: "5mb" }),
  async (req, res) => {
    const parsed = z
      .object({
        conversationId: z.uuid(),
        name: z.string().trim().min(1).max(255),
      })
      .safeParse(req.query);
    if (!parsed.success || !Buffer.isBuffer(req.body))
      return res
        .status(400)
        .json({ error: "Choose a file and a valid conversation." });
    try {
      const { conversationId, name } = parsed.data;
      const content = await extractDocument(name, req.body);
      const id = await saveDocument(conversationId, name, content);
      return res.json({ id, name, verification: verifyLetter(content) });
    } catch (error) {
      if (error instanceof DocumentError)
        return res.status(400).json({ error: error.message });
      throw error;
    }
  },
);
app.use(express.json({ limit: "512kb" }));

app.get("/api/documents/:id/verification", async (req, res) => {
  const id = z.uuid().safeParse(req.params.id);
  const conversationId = z.uuid().safeParse(req.query.conversationId);
  if (!id.success || !conversationId.success)
    return res
      .status(400)
      .json({ error: "Invalid document or conversation ID." });
  const document = await loadDocument(id.data, conversationId.data);
  if (!document)
    return res
      .status(404)
      .json({ error: "Letter not found in this conversation." });
  return res.json(verifyLetter(document.content));
});

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  if (backend) {
    const info = await backend.info();
    return res.json({
      database: "connected",
      mode: "backend",
      model: info.model,
      backend: info,
    });
  }
  res.json({
    database: "connected",
    mode: demoMode ? "demo" : "live",
    model: demoMode ? "Sample responses" : modelName,
    credentialExpiresAt: process.env.AZURE_CREDENTIAL_EXPIRES_AT || null,
  });
});

app.get("/api/conversations", async (_req, res) => {
  const result = await pool.query(
    "SELECT id, title, updated_at FROM conversations ORDER BY updated_at DESC LIMIT 50",
  );
  res.json(result.rows);
});

app.get("/api/conversations/:id", async (req, res) => {
  if (!z.uuid().safeParse(req.params.id).success)
    return res.status(400).json({ error: "Invalid conversation ID." });
  const messages = await loadConversation(req.params.id);
  if (!messages)
    return res.status(404).json({ error: "Conversation not found." });
  res.json({ messages });
});

app.post("/api/chat", async (req, res) => {
  const parsed = chatRequest.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({
      error:
        "Send a valid conversation with up to 100 messages and 20,000 characters per message.",
    });
  const { id, messages: received } = parsed.data;
  const messages = received.filter(
    (message) => message.role !== "assistant" || textOf(message).trim(),
  );
  const last = messages.at(-1);
  if (
    !backend &&
    !demoMode &&
    accessExpired(process.env.AZURE_CREDENTIAL_EXPIRES_AT)
  )
    return res.status(503).json({
      error:
        "Temporary AI access has expired. Renew the Foundry credential and restart the server.",
    });
  if (last?.role !== "user" || !textOf(last).trim())
    return res
      .status(400)
      .json({ error: "The last message must be a question." });
  if (activeChats.has(id))
    return res
      .status(409)
      .json({ error: "This conversation is already generating an answer." });
  activeChats.add(id);
  const controller = new AbortController();
  res.on("close", () => {
    controller.abort();
  });
  try {
    const sourceId = last.metadata?.simplifyMessageId;
    const saved = sourceId ? await loadConversation(id) : undefined;
    const source = saved?.find(
      (message) => message.id === sourceId && message.role === "assistant",
    );
    if (sourceId && !source)
      return res
        .status(400)
        .json({ error: "That answer is not saved yet. Please try again." });
    const groundedMessages: UIMessage[] = [];
    let documentCharacters = 0;
    for (const message of messages) {
      const documentId = message.metadata?.documentId;
      if (!documentId) {
        groundedMessages.push(message);
        continue;
      }
      if (message.role !== "user")
        return res
          .status(400)
          .json({ error: "Only user messages can attach a letter." });
      const document = await loadDocument(documentId, id);
      if (!document)
        return res.status(400).json({
          error:
            "This letter is not available in this conversation. Please upload it again.",
        });
      documentCharacters += document.content.length;
      if (documentCharacters > 60000)
        return res.status(400).json({
          error:
            "There are too many letters in this conversation. Start a new chat to explain another letter.",
        });
      groundedMessages.push({
        ...message,
        parts: [
          { type: "text", text: letterPrompt(document.name, document.content) },
        ],
      });
    }
    const modelMessages: UIMessage[] = source
      ? [
          ...groundedMessages.slice(0, -1),
          {
            ...last,
            parts: [{ type: "text", text: simplificationPrompt(source) }],
          },
        ]
      : groundedMessages;
    await saveConversation(id, messages);
    const stream = createUIMessageStream<UIMessage>({
      originalMessages: messages,
      generateId: randomUUID,
      execute: async ({ writer }) => {
        if (backend) {
          writer.merge(await backend.stream(modelMessages, controller.signal));
        } else if (demoMode) {
          const textId = randomUUID();
          writer.write({ type: "start" });
          writer.write({ type: "text-start", id: textId });
          const answer = documentCharacters
            ? "**Your letter is ready.**\n\nDemo mode cannot explain the contents of your letter. Connect the AI service, then retry for a plain-language explanation of its key details and any actions it asks you to take."
            : demoAnswer(Boolean(source));
          for (const token of answer.match(/\S+\s*/g) || []) {
            if (controller.signal.aborted) break;
            writer.write({ type: "text-delta", id: textId, delta: token });
            await new Promise((resolve) => setTimeout(resolve, 18));
          }
          writer.write({ type: "text-end", id: textId });
          writer.write({ type: "finish" });
        } else {
          const result = streamText({
            model: await getModel(),
            system: systemPrompt,
            messages: await convertToModelMessages(modelMessages),
            abortSignal: controller.signal,
            maxOutputTokens: 1600,
            maxRetries: 1,
            onError: () => {
              console.error(
                "AI provider request failed. Check the configured key and model access.",
              );
            },
          });
          writer.merge(result.toUIMessageStream({ onError: streamError }));
        }
      },
      onEnd: async ({ messages: completed }) => {
        await saveConversation(
          id,
          completed.filter(
            (message) => message.role !== "assistant" || textOf(message).trim(),
          ),
        );
      },
      onError: streamError,
    });
    await pipeUIMessageStreamToResponse({ response: res, stream });
  } finally {
    activeChats.delete(id);
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});
app.use(express.static("dist"));
app.get("/{*path}", (_req, res) => {
  res.sendFile("index.html", { root: "dist" });
});

app.use(((error, _req, res, _next) => {
  console.error(
    "Request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  if (!res.headersSent) {
    const status =
      error.status === 413 ? 413 : error instanceof SyntaxError ? 400 : 503;
    res.status(status).json({
      error:
        status === 413
          ? "File or message is too large. Letters must be under 5 MB."
          : status === 400
            ? "Invalid request."
            : error instanceof BackendError
              ? error.message
              : "Could not reach a required service. Check Postgres, the backend session and your connection, then retry.",
    });
  }
}) satisfies express.ErrorRequestHandler);
