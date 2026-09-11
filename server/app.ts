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
import { loadConversation, pool, saveConversation } from "./db";
import { accessExpired, demoMode, getModel, modelName } from "./model";

export const app = express();
const activeChats = new Set<string>();
const streamError = (error: unknown) =>
  error instanceof BackendError
    ? error.message
    : backend
      ? "Could not complete the answer through BOI staging. Check the server session and connection, then retry."
      : "Could not complete the answer. Check your AI key, model access and connection, then retry.";
app.disable("x-powered-by");
app.use(express.json({ limit: "512kb" }));

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
    const modelMessages: UIMessage[] = source
      ? [
          ...messages.slice(0, -1),
          {
            ...last,
            parts: [{ type: "text", text: simplificationPrompt(source) }],
          },
        ]
      : messages;
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
          for (const token of demoAnswer(Boolean(source)).match(/\S+\s*/g) ||
            []) {
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
          ? "Message is too large."
          : status === 400
            ? "Invalid request."
            : error instanceof BackendError
              ? error.message
              : "Could not reach a required service. Check Postgres, the backend session and your connection, then retry.",
    });
  }
}) satisfies express.ErrorRequestHandler);
