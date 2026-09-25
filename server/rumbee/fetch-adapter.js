function toFetchRequest(req) {
  return new Request(`http://internal${req.originalUrl}`, {
    method: req.method,
    headers: { "X-Rumbee-Callback-Secret": req.get("X-Rumbee-Callback-Secret") ?? "" },
    body: JSON.stringify(req.body),
  });
}

async function writeFetchResponse(fetchResponse, res) {
  const text = await fetchResponse.text();
  res.status(fetchResponse.status).send(text);
}

module.exports = { toFetchRequest, writeFetchResponse };
