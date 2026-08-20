const excludedRequestHeaders = new Set([
  "connection",
  "content-length",
  "host",
  "transfer-encoding",
]);

const excludedResponseHeaders = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "transfer-encoding",
]);

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

const defaultBackendUrl =
  "https://lovdatapoc-c4ajbfcxh7f0dpcd.westeurope-01.azurewebsites.net";

export default async function handler(request, response) {
  const backendUrl = (process.env.BACKEND_API_URL || defaultBackendUrl).replace(
    /\/$/,
    "",
  );
  const target = Array.isArray(request.query.target)
    ? request.query.target[0]
    : request.query.target;

  if (!target || (!target.startsWith("/api/") && !target.startsWith("/openapi/"))) {
    return response.status(400).json({ error: "Invalid backend path" });
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (!excludedRequestHeaders.has(name.toLowerCase()) && value !== undefined) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  headers.set("x-forwarded-host", request.headers.host ?? "");
  headers.set("x-forwarded-proto", "https");

  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await readBody(request);
    const backendResponse = await fetch(`${backendUrl}${target}`, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });

    for (const [name, value] of backendResponse.headers.entries()) {
      if (!excludedResponseHeaders.has(name.toLowerCase())) {
        response.setHeader(name, value);
      }
    }

    const payload = Buffer.from(await backendResponse.arrayBuffer());
    return response.status(backendResponse.status).send(payload);
  } catch (error) {
    console.error("Backend proxy request failed:", error);
    return response.status(502).json({ error: "Backend request failed" });
  }
}
