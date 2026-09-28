// Vendored (browser port) from docsales/rumbee-app-sdk lib/analytics.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
// Business events for RumBee's product analytics (PostHog). Requires
// https://id.rumbee.ai/analytics.js in the page <head> (AI-AGENT.md → Analytics);
// without it — or outside production — this is a silent no-op.
// Name events object_verb, snake_case, past tense (link_created). Don't put your
// product in the name: analytics.js already attaches it to every event.
window.rumbeeAnalytics = {
  track: function (event, properties) {
    window.posthog?.capture(event, properties);
  },
};
