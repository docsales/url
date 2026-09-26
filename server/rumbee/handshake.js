// Clerk's authenticateRequest() returns status "handshake" on a satellite's
// first visit after signing in elsewhere on *.rumbee.ai — it hasn't seen the
// session cookie yet and hands back headers (a Location redirect, sometimes
// Set-Cookie) that complete the sync. Forward them verbatim; substituting
// our own redirect drops the sync and trips Clerk's own redirect-loop guard
// on the next attempt.

function forwardHandshake(requestState, res) {
  if (requestState.status !== "handshake") return false;

  const location = requestState.headers.get("location");
  if (!location) return false;

  for (const [key, value] of requestState.headers) {
    if (key.toLowerCase() !== "location") res.append(key, value);
  }
  res.redirect(307, location);
  return true;
}

module.exports = { forwardHandshake };
