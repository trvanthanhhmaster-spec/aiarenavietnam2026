import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { GoogleAuth } from "google-auth-library";
import { Storage } from "@google-cloud/storage";

const port = Number(process.env.PORT || 8080);
const project = process.env.GOOGLE_CLOUD_PROJECT || "ai-arena-vietnam-2026";
const location = process.env.GOOGLE_CLOUD_VIDEO_LOCATION || "us-central1";
const sharedSecret = process.env.BRIDGE_SHARED_SECRET || "";
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
const storage = new Storage();

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(typeof body === "string" ? body : JSON.stringify(body));
}

function reject(response, status, message) {
  send(response, status, { error: message });
}

function authorized(request) {
  if (!sharedSecret) return false;
  const provided = request.headers["x-vremix-bridge-secret"];
  if (typeof provided !== "string") return false;
  const expected = Buffer.from(sharedSecret);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 12 * 1024 * 1024) throw new Error("Request body is too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function accessToken() {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Cloud Run could not obtain an ADC access token.");
  return token.token;
}

function vertexUrl(path) {
  return `https://aiplatform.googleapis.com/v1/${path}`;
}

async function vertexRequest(path, init = {}) {
  const token = await accessToken();
  const response = await fetch(vertexUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-user-project": project,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    contentType: response.headers.get("content-type") || "application/json",
    body: text,
  };
}

async function downloadVideo(uri) {
  if (uri.startsWith("gs://")) {
    const withoutScheme = uri.slice(5);
    const slash = withoutScheme.indexOf("/");
    if (slash < 1) throw new Error("Invalid Google Cloud Storage video URI.");
    const bucket = withoutScheme.slice(0, slash);
    const object = withoutScheme.slice(slash + 1);
    const file = storage.bucket(bucket).file(object);
    const [bytes] = await file.download();
    const [metadata] = await file.getMetadata();
    return {
      bytes,
      contentType: metadata.contentType || "video/mp4",
    };
  }

  const token = await accessToken();
  const response = await fetch(uri, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-goog-user-project": project,
    },
  });
  if (!response.ok) throw new Error(`Unable to download Veo video (HTTP ${response.status}).`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "video/mp4",
  };
}

async function handle(request, response) {
  if (request.method === "GET" && request.url === "/healthz") {
    return send(response, 200, { ok: true, provider: "vertex-ai", location });
  }
  if (!authorized(request)) return reject(response, 401, "Bridge authentication failed.");

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  if (request.method === "POST" && url.pathname === "/v1/veo/generate") {
    const input = await readJson(request);
    const model = input.model || "veo-3.1-fast-generate-001";
    const result = await vertexRequest(
      `projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:predictLongRunning`,
      {
        method: "POST",
        body: JSON.stringify({
          instances: input.instances || [],
          parameters: input.parameters || {},
        }),
      },
    );
    return send(response, result.status, result.body, { "content-type": result.contentType });
  }

  if (request.method === "GET" && url.pathname === "/v1/veo/operation") {
    const name = url.searchParams.get("name");
    if (!name) return reject(response, 400, "Operation name is required.");
    const marker = "/operations/";
    const markerIndex = name.indexOf(marker);
    if (markerIndex < 1) return reject(response, 400, "Invalid Veo operation name.");
    const modelPath = name.slice(0, markerIndex);
    const result = await vertexRequest(`${modelPath}:fetchPredictOperation`, {
      method: "POST",
      body: JSON.stringify({ operationName: name }),
    });
    return send(response, result.status, result.body, { "content-type": result.contentType });
  }

  if (request.method === "GET" && url.pathname === "/v1/veo/download") {
    const uri = url.searchParams.get("uri");
    if (!uri) return reject(response, 400, "Video URI is required.");
    const result = await downloadVideo(uri);
    response.writeHead(200, {
      "content-type": result.contentType,
      "content-length": result.bytes.length,
      "cache-control": "private, max-age=300",
    });
    return response.end(result.bytes);
  }

  return reject(response, 404, "Not found.");
}

const server = http.createServer((request, response) => {
  handle(request, response).catch((error) => {
    console.error(error);
    reject(response, 502, error instanceof Error ? error.message : "Bridge request failed.");
  });
});

server.listen(port, () => {
  console.log(`Vertex bridge listening on ${port}`);
});
