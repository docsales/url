const { test } = require("node:test");
const assert = require("node:assert/strict");

const { forwardHandshake } = require("./handshake");

function fakeRes() {
  const appended = [];
  let redirected = null;
  return {
    appended,
    get redirected() {
      return redirected;
    },
    append(key, value) {
      appended.push([key, value]);
    },
    redirect(status, url) {
      redirected = { status, url };
    },
  };
}

test("non-handshake status is not handled", () => {
  const res = fakeRes();
  const handled = forwardHandshake({ status: "signed-out", headers: new Headers() }, res);
  assert.equal(handled, false);
  assert.equal(res.redirected, null);
  assert.deepEqual(res.appended, []);
});

test("handshake with no location header is not handled", () => {
  const res = fakeRes();
  const handled = forwardHandshake({ status: "handshake", headers: new Headers() }, res);
  assert.equal(handled, false);
  assert.equal(res.redirected, null);
});

test("handshake with a location header issues a 307 redirect and forwards other headers", () => {
  const res = fakeRes();
  const headers = new Headers();
  headers.set("location", "https://id.rumbee.ai/handshake?token=abc");
  headers.append("set-cookie", "__client_uat=123; Path=/");
  headers.set("cache-control", "no-store");

  const handled = forwardHandshake({ status: "handshake", headers }, res);

  assert.equal(handled, true);
  assert.deepEqual(res.redirected, {
    status: 307,
    url: "https://id.rumbee.ai/handshake?token=abc",
  });
  assert.ok(res.appended.some(([k, v]) => k.toLowerCase() === "set-cookie" && v === "__client_uat=123; Path=/"));
  assert.ok(res.appended.some(([k, v]) => k.toLowerCase() === "cache-control" && v === "no-store"));
  assert.ok(!res.appended.some(([k]) => k.toLowerCase() === "location"));
});
