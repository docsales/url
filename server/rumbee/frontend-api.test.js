const { test } = require("node:test");
const assert = require("node:assert/strict");

const { frontendApiFromPublishableKey } = require("./frontend-api");

test("decodes the Frontend API host from a live publishable key", () => {
  assert.equal(frontendApiFromPublishableKey("pk_live_Y2xlcmsucnVtYmVlLmFpJA"), "clerk.rumbee.ai");
});

test("decodes a test publishable key", () => {
  const key = "pk_test_" + Buffer.from("example.clerk.accounts.dev$").toString("base64");
  assert.equal(frontendApiFromPublishableKey(key), "example.clerk.accounts.dev");
});

test("returns null for a missing or malformed key", () => {
  assert.equal(frontendApiFromPublishableKey(""), null);
  assert.equal(frontendApiFromPublishableKey("not-a-key"), null);
  assert.equal(frontendApiFromPublishableKey("pk_live_" + Buffer.from("no-dollar").toString("base64")), null);
});
