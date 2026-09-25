const { test } = require("node:test");
const assert = require("node:assert/strict");

const { toFetchRequest, writeFetchResponse } = require("./fetch-adapter");

test("toFetchRequest carries method, secret header, and re-serialized JSON body", async () => {
  const req = {
    method: "POST",
    originalUrl: "/api/webhooks/rumbee-login",
    get: (name) => (name === "X-Rumbee-Callback-Secret" ? "s3cr3t" : undefined),
    body: { event: "ping" },
  };

  const fetchRequest = toFetchRequest(req);

  assert.equal(fetchRequest.method, "POST");
  assert.equal(fetchRequest.headers.get("X-Rumbee-Callback-Secret"), "s3cr3t");
  assert.deepEqual(await fetchRequest.json(), { event: "ping" });
});

test("toFetchRequest sends an empty secret header when none was sent", async () => {
  const req = {
    method: "POST",
    originalUrl: "/api/webhooks/rumbee-login",
    get: () => undefined,
    body: { event: "ping" },
  };

  const fetchRequest = toFetchRequest(req);

  assert.equal(fetchRequest.headers.get("X-Rumbee-Callback-Secret"), "");
});

test("writeFetchResponse copies status and body onto the Express response", async () => {
  const calls = { status: null, sent: null };
  const res = {
    status(code) {
      calls.status = code;
      return this;
    },
    send(body) {
      calls.sent = body;
    },
  };

  await writeFetchResponse(new Response(null, { status: 401 }), res);

  assert.equal(calls.status, 401);
  assert.equal(calls.sent, "");
});
