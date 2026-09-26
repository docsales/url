// A Clerk publishable key is "pk_<env>_" + base64("<frontend api host>$").
// The browser loads clerk-js and @clerk/ui from that host.

function frontendApiFromPublishableKey(publishableKey) {
  const match = /^pk_(?:live|test)_(.+)$/.exec(publishableKey || "");
  if (!match) return null;
  const decoded = Buffer.from(match[1], "base64").toString("utf8");
  if (!decoded.endsWith("$")) return null;
  return decoded.slice(0, -1);
}

module.exports = { frontendApiFromPublishableKey };
