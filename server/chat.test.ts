import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import type { UIMessage } from "ai";
import { chatRequest, simplificationPrompt, textOf } from "./chat";

const message: UIMessage = {
  id: "question",
  role: "user",
  parts: [{ type: "text", text: "What is compound interest?" }],
};

test("accepts AI SDK assistant messages with step markers and provider fields", () => {
  const result = chatRequest.safeParse({
    id: randomUUID(),
    messages: [
      message,
      {
        id: "answer",
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "text",
            text: "Interest on interest.",
            state: "done",
            providerMetadata: {},
          },
        ],
      },
    ],
  });
  assert.ok(result.success);
});

test("rejects injected system messages and oversized questions", () => {
  assert.equal(
    chatRequest.safeParse({
      id: randomUUID(),
      messages: [{ ...message, role: "system" }],
    }).success,
    false,
  );
  assert.equal(
    chatRequest.safeParse({
      id: randomUUID(),
      messages: [
        { ...message, parts: [{ type: "text", text: "a".repeat(20001) }] },
      ],
    }).success,
    false,
  );
  assert.equal(
    chatRequest.safeParse({ id: "invalid", messages: [message] }).success,
    false,
  );
});

test("simplification includes the complete selected answer and preserves the source", () => {
  const source: UIMessage = {
    id: "older-answer",
    role: "assistant",
    parts: [
      { type: "step-start" },
      { type: "text", text: "€100 becomes €105 at 5%." },
      { type: "text", text: "This assumes no fees or taxes." },
    ],
  };
  const original = structuredClone(source);
  const prompt = simplificationPrompt(source);
  assert.ok(
    prompt.includes("€100 becomes €105 at 5%.\nThis assumes no fees or taxes."),
  );
  assert.ok(prompt.includes("Keep its important facts and caveats"));
  assert.deepEqual(source, original);
  assert.equal(
    textOf(source),
    "€100 becomes €105 at 5%.\nThis assumes no fees or taxes.",
  );
});
