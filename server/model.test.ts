import assert from "node:assert/strict";
import { test } from "node:test";
import { accessExpired } from "./model";

test("temporary access stops exactly at expiry, including malformed or missing expiry", () => {
  const expires = "2026-09-12T12:00:00.000Z";
  const end = Date.parse(expires);
  assert.equal(accessExpired(expires, end - 1), false);
  assert.equal(accessExpired(expires, end), true);
  assert.equal(accessExpired(expires, end + 1), true);
  assert.equal(accessExpired("invalid", end), true);
  assert.equal(accessExpired(undefined, end), true);
});
