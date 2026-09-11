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

// Fixed Team 25 sources for this demo; never changes shared staging defaults.
const investmentCollections = [
  "35cb7d83-a92c-447f-953c-060a243d9062", // Emerald master terms
  "15772165-59d3-4fa1-92bf-c7750d0363c9", // Emerald disclosures
  "f215a321-d5fd-4134-86e1-69323799de16", // Reviewed New Ireland documents
  "c6efc7d7-bab8-43d7-8608-8df51115e1d0", // Fictional product catalogue
  "a4f102aa-b2a8-4ea5-9569-628265e0807b", // Product risk and cost register
];

export class BackendError extends Error {}

export class BuildpromptBackend {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    readonly origin: string,
    private sessionPath = ".backend-session.json",
    private collectionIds: string[] | undefined = origin ===
    "https://staging.boi.buildprompt.app"
      ? investmentCollections
      : undefined,
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

  async query(procedure: string, input?: unknown): Promise<unknown> {
    const search =
      input === undefined
        ? ""
        : `?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
    const response = await this.request(`/api/trpc/${procedure}${search}`);
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

  async sourceFiles() {
    const collectionIds =
      this.collectionIds ??
      z
        .object({ collectionIds: z.array(z.string()) })
        .parse(await this.query("sourceDefaults.getSettings")).collectionIds;
    const files: { id: string; name: string }[] = [];
    for (const id of collectionIds) {
      let page = 1;
      let totalPages = 1;
      do {
        const result = z
          .object({
            files: z.array(
              z.object({ id: z.uuid(), name: z.string(), status: z.string() }),
            ),
            pagination: z.object({
              totalPages: z.number().int().nonnegative(),
            }),
          })
          .parse(
            await this.query("sources.getCollection", {
              id,
              page,
              pageSize: 200,
            }),
          );
        files.push(
          ...result.files
            .filter((file) => file.status === "ready")
            .map(({ id, name }) => ({ id, name })),
        );
        totalPages = result.pagination.totalPages;
        page++;
      } while (page <= totalPages);
    }
    return files;
  }

  async sourceFile(id: string) {
    if (!z.uuid().safeParse(id).success) return undefined;
    const file = (await this.sourceFiles()).find((file) => file.id === id);
    if (!file) return undefined;
    const response = await this.request(`/api/files/${id}`);
    return { file, response };
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
    const collectionIds = this.collectionIds ?? defaults.collectionIds;
    if (collectionIds.some((id) => !collections.some((item) => item.id === id)))
      throw new BackendError(
        "A selected BOI document collection is unavailable. Check BUILDPROMPT_COLLECTION_IDS.",
      );
    const selected = collections.filter((collection) =>
      collectionIds.includes(collection.id),
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
        ...(this.collectionIds
          ? { sourceSelection: { collections: this.collectionIds, files: [] } }
          : {}),
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
    ? new BuildpromptBackend(
        process.env.BUILDPROMPT_URL.replace(/\/$/, ""),
        undefined,
        process.env.BUILDPROMPT_COLLECTION_IDS?.split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      )
    : undefined;
