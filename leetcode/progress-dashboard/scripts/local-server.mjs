import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const clientRoot = path.join(projectRoot, "dist", "client");
const serverEntry = path.join(projectRoot, "dist", "server", "index.js");

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

async function loadWorker() {
  try {
    await stat(serverEntry);
  } catch {
    throw new Error("Missing production build. Run `npm run build` first.");
  }

  const workerModule = await import(pathToFileURL(serverEntry));
  return workerModule.default;
}

function resolveClientFile(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  if (!relativePath) return null;

  const filePath = path.resolve(clientRoot, relativePath);
  if (!filePath.startsWith(`${clientRoot}${path.sep}`)) return null;
  return filePath;
}

async function serveClientFile(request, response, pathname) {
  const filePath = resolveClientFile(pathname);
  if (!filePath) return false;

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) return false;

    const body = await readFile(filePath);
    response.statusCode = 200;
    response.setHeader(
      "Content-Type",
      contentTypes.get(path.extname(filePath).toLowerCase()) ||
        "application/octet-stream",
    );
    response.setHeader(
      "Cache-Control",
      pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    );
    response.setHeader("Content-Length", body.byteLength);

    if (request.method === "HEAD") {
      response.end();
    } else {
      response.end(body);
    }
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "EISDIR") return false;
    throw error;
  }
}

function createFetchRequest(request) {
  const url = new URL(request.url || "/", `http://${host}:${port}`);
  const init = {
    method: request.method,
    headers: request.headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = Readable.toWeb(request);
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function writeFetchResponse(fetchResponse, response) {
  response.statusCode = fetchResponse.status;
  response.statusMessage = fetchResponse.statusText;

  fetchResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });

  if (!fetchResponse.body) {
    response.end();
    return;
  }

  const body = Buffer.from(await fetchResponse.arrayBuffer());
  response.end(body);
}

const worker = await loadWorker();

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (await serveClientFile(request, response, url.pathname)) return;

    const fetchResponse = await worker.fetch(createFetchRequest(request), {});
    await writeFetchResponse(fetchResponse, response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader("Content-Type", "text/plain; charset=utf-8");
    }
    response.end("Local server error");
  }
});

server.listen(port, host, () => {
  console.log(`LeetCode Progress Command Center: http://${host}:${port}`);
});
