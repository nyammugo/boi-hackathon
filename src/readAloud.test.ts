import assert from "node:assert/strict";
import { test } from "node:test";
import { canReadAloud, speechChunks } from "./readAloud";

test("splits sentences and list items without losing financial figures", () => {
  const text = "\nEarn 3.5% on €1,000. Keep saving!\nFirst item\nSecond item\n";
  const chunks = speechChunks(text);
  assert.deepEqual(
    chunks.map((chunk) => chunk.text),
    ["Earn 3.5% on €1,000.", "Keep saving!", "First item", "Second item"],
  );
  for (const chunk of chunks)
    assert.equal(text.slice(chunk.start, chunk.end), chunk.text);
});

test("preserves offsets across whitespace, emoji, and repeated words", () => {
  const text = "  Save  💶 money.\n\nSave\tmoney again.  ";
  assert.deepEqual(speechChunks(text), [
    { text: "Save  💶 money.", start: 2, end: 17 },
    { text: "Save\tmoney again.", start: 19, end: 36 },
  ]);
});

test("breaks long passages at word boundaries and retains the entire answer", () => {
  const text = "This answer contains many words ".repeat(100).trim();
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.text.length <= 220));
  assert.equal(chunks.map((chunk) => chunk.text).join(" "), text);
});

test("ignores empty answers and safely detects unavailable browser speech", () => {
  assert.deepEqual(speechChunks(" \n\t "), []);
  assert.equal(canReadAloud(), false);
});
