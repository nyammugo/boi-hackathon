import assert from "node:assert/strict";
import { test } from "node:test";
import { wordAtTime } from "./readAloud";

const words = [
  { start: 2, end: 6, startTime: 0.2, endTime: 0.6 },
  { start: 8, end: 14, startTime: 0.8, endTime: 1.4 },
];

test("follows the audio clock, including seeking backwards", () => {
  assert.equal(wordAtTime(words, 0.2), words[0]);
  assert.equal(wordAtTime(words, 1.1), words[1]);
  assert.equal(wordAtTime(words, 0.3), words[0]);
});

test("does not highlight before speech, during pauses, or after playback", () => {
  for (const time of [0, 0.6, 0.7, 1.4, 2])
    assert.equal(wordAtTime(words, time), undefined);
  assert.equal(wordAtTime([], 1), undefined);
});
