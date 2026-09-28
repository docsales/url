const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { track } = require("./analytics");

function response() {
  return new http.ServerResponse(new http.IncomingMessage());
}

function triggers(res) {
  return JSON.parse(res.getHeader("HX-Trigger"));
}

test("names the event and its properties in HX-Trigger for the browser to send", () => {
  const res = response();

  track(res, "link_created", { custom_address: true });

  assert.deepEqual(triggers(res), {
    "rumbee-track": { event: "link_created", properties: { custom_address: true } },
  });
});

test("an event without properties sends none", () => {
  const res = response();

  track(res, "link_deleted");

  assert.deepEqual(triggers(res), { "rumbee-track": { event: "link_deleted" } });
});

test("keeps an event the handler already triggers by name", () => {
  const res = response();
  res.setHeader("HX-Trigger", "reloadMainTable");

  track(res, "link_deleted");

  assert.deepEqual(Object.keys(triggers(res)), ["reloadMainTable", "rumbee-track"]);
});

test("keeps events the handler already triggers as JSON", () => {
  const res = response();
  res.setHeader("HX-Trigger", JSON.stringify({ showMessage: { level: "info" } }));

  track(res, "link_created");

  assert.deepEqual(triggers(res).showMessage, { level: "info" });
});
