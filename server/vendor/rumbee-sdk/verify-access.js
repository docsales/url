// Vendored (CommonJS port) from docsales/rumbee-app-sdk lib/verify-access.ts.
// Logic must stay identical to upstream — re-port by hand if upstream changes.
const { createRemoteJWKSet, jwtVerify } = require("jose");

let jwks = null;

async function verifyAccessToken(token, loginBaseUrl) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/.well-known/jwks.json", loginBaseUrl));
  }
  const { payload } = await jwtVerify(token, jwks, { algorithms: ["RS256"] });
  return payload;
}

module.exports = { verifyAccessToken };
