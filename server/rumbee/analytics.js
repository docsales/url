// Business events for RumBee's product analytics (PostHog, loaded by
// id.rumbee.ai/analytics.js). The browser can't tell a successful htmx request
// from a validation error here — both come back 200 with HTML — so the handler
// that did the work names the event in HX-Trigger and static/scripts/main.js
// hands it to track() (static/scripts/rumbee-analytics.js).
//
// Names are object_verb, snake_case, past tense (link_created), without the
// product (analytics.js adds it). Properties never carry personal data: no
// emails, names or the links' own URLs. Call it after any other
// res.setHeader("HX-Trigger", ...) of the same response, which would replace it.

const EVENT = "rumbee-track";

function track(res, event, properties) {
  const triggers = parse(res.getHeader("HX-Trigger"));
  triggers[EVENT] = { event, properties };
  res.setHeader("HX-Trigger", JSON.stringify(triggers));
}

// htmx takes either JSON or a comma-separated list of event names
function parse(header) {
  if (!header) return {};
  if (header.startsWith("{")) return JSON.parse(header);
  return Object.fromEntries(header.split(",").map(name => [name.trim(), {}]));
}

module.exports = { track };
