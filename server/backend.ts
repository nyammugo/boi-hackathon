import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import {
  parseJsonEventStream,
  type UIMessage,
  type UIMessageChunk,
  uiMessageChunkSchema,
} from "ai";
import { z } from "zod";
import { plainLanguagePrompt } from "./chat";
import { accessExpired } from "./model";

const sessionSchema = z.object({
  origin: z.url(),
  cookie: z.string().min(1),
  expiresAt: z.string(),
  workosUserId: z.string(),
});
const defaultsSchema = z.object({
  effectivePromptingDefaultEndpointName: z.string(),
  effectivePromptingDefaultEndpointId: z.string(),
});
const sourcesSchema = z.array(
  z.object({ id: z.string(), name: z.string(), sourceCount: z.number() }),
);

export class BackendError extends Error {}

export class BuildpromptBackend {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    readonly origin: string,
    private sessionPath = ".backend-session.json",
  ) {}

  request(path: string, init?: RequestInit): Promise<Response> {
    const task = this.queue.then(async () => {
      const url = new URL(path, this.origin);
      if (url.origin !== this.origin || !url.pathname.startsWith("/api/"))
        throw new BackendError("Invalid backend route.");
      const session = sessionSchema.parse(
        JSON.parse(await readFile(this.sessionPath, "utf8")),
      );
      if (session.origin !== this.origin)
        throw new BackendError(
          "The backend session belongs to a different environment.",
        );
      if (accessExpired(session.expiresAt))
        throw new BackendError(
          "Temporary BOI backend access has expired. Renew the server session to continue.",
        );
      const response = await fetch(url, {
        ...init,
        headers: { "content-type": "application/json", cookie: session.cookie },
        redirect: "manual",
        signal: init?.signal ?? AbortSignal.timeout(30000),
      });
      const renewed = response.headers
        .getSetCookie()
        .find((cookie) => cookie.startsWith("wos-session="));
      if (renewed) {
        session.cookie = renewed.split(";")[0];
        await writeFile(this.sessionPath, JSON.stringify(session, null, 2), {
          mode: 0o600,
        });
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new BackendError(
          response.status === 401 || response.status === 403
            ? "The BOI backend session was rejected. Reconnect the server to staging."
            : `The BOI backend is unavailable (HTTP ${response.status}). Please retry.`,
        );
      }
      return response;
    });
    this.queue = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  async query(procedure: string): Promise<unknown> {
    const response = await this.request(`/api/trpc/${procedure}`);
    const envelope = z
      .object({
        result: z.object({
          data: z.object({
            json: z.unknown(),
            meta: z.record(z.string(), z.unknown()).optional(),
          }),
        }),
      })
      .parse(await response.json());
    return envelope.result.data.json;
  }

  async info() {
    const model = defaultsSchema.parse(await this.query("modelDefaults.get"));
    if (!model.effectivePromptingDefaultEndpointName.includes("sonnet-5"))
      throw new BackendError(
        "BOI staging is not configured to use Sonnet 5 for chat.",
      );
    const defaults = z
      .object({ collectionIds: z.array(z.string()) })
      .parse(await this.query("sourceDefaults.getSettings"));
    const collections = sourcesSchema.parse(
      await this.query("sources.getCollections"),
    );
    const selected = collections.filter((collection) =>
      defaults.collectionIds.includes(collection.id),
    );
    return {
      model: model.effectivePromptingDefaultEndpointName,
      origin: this.origin,
      collections: selected.map(({ name }) => name),
      documentCount: selected.reduce(
        (total, collection) => total + collection.sourceCount,
        0,
      ),
    };
  }

  async stream(
    messages: UIMessage[],
    signal: AbortSignal,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const response = await this.request("/api/chat", {
      method: "POST",
      // Staging owns its system prompt and accepts no custom system field.
      // Add writing guidance to this request only, leaving saved messages intact.
      body: JSON.stringify({
        messages: messages.map((message, index) =>
          index === messages.length - 1 && message.role === "user"
            ? {
                ...message,
                parts: [
                  ...message.parts,
                  { type: "text", text: plainLanguagePrompt },
                ],
              }
            : message,
        ),
      }),
      signal,
    });
    if (
      !response.body ||
      !response.headers.get("content-type")?.includes("text/event-stream")
    )
      throw new BackendError("BOI staging did not return a chat stream.");
    return parseJsonEventStream({
      stream: response.body,
      schema: uiMessageChunkSchema,
    }).pipeThrough(
      new TransformStream({
        transform(result, controller) {
          if (!result.success)
            throw new Error("The backend returned an invalid stream event.");
          controller.enqueue(result.value);
        },
      }),
    );
  }
}

export const backend =
  process.env.BUILDPROMPT_URL && process.env.DEMO_MODE !== "true"
    ? new BuildpromptBackend(process.env.BUILDPROMPT_URL.replace(/\/$/, ""))
    : undefined;
