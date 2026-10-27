// Local preview of the PRODUCTION build (what `npm run build` produced).
//
// The game deploys to Vercel: `npm run build` emits the Vercel Build Output
// API in .vercel/output/ — static assets in .vercel/output/static/ and the
// SSR server function in .vercel/output/functions/__server.func/. This tiny
// zero-dependency Node server mimics that hosting setup locally: static files
// are served straight from the static dir and everything else goes through
// the built server function — exactly like Vercel would run it.
// (When a Lovable-sandbox cloudflare build is present instead, that layout is
// detected and served too.)
//
// Usage:  npm run build && npm run preview
// Then open http://localhost:4173

import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const root = resolve(fileURLToPath(import.meta.url), "..", "..");

// Which production layout are we serving?
const vercelServer = join(root, ".vercel", "output", "functions", "__server.func", "index.mjs");
const vercelClient = join(root, ".vercel", "output", "static");
const cfServer = join(root, "dist", "server", "index.mjs");
const cfClient = join(root, "dist", "client");
const isVercel = existsSync(vercelServer);
if (isVercel) {
  var worker = (await import(vercelServer)).default;
  var clientDir = vercelClient;
} else {
  var worker = (await import(cfServer)).default;
  var clientDir = cfClient;
}
const provider = isVercel ? "Vercel (.vercel/output)" : "cloudflare (dist/)";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Cloudflare-style ASSETS binding: serve a file from dist/client. */
const assets = {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let file = join(clientDir, safe);
    if (!file.startsWith(clientDir)) return new Response("Forbidden", { status: 403 });
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) return new Response("Not found", { status: 404 });
    const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
    return new Response(createReadStream(file), {
      headers: { "content-type": type },
    });
  },
};

/** Static asset lookup used when serving the Vercel output locally. */
function staticFile(rawUrl) {
  const url = new URL(rawUrl, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(clientDir, safe);
  if (!file.startsWith(clientDir)) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return null;
  const type = MIME[extname(file).toLowerCase()] || "application/octet-stream";
  return Promise.resolve(
    new Response(createReadStream(file), { headers: { "content-type": type } }),
  );
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const body =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await new Response(req).arrayBuffer().catch(() => undefined);
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body,
      duplex: "half",
    });
    // Vercel mode: static files live on the CDN, so we serve them here first
    // and only hand non-asset requests to the server function.
    const webRes = isVercel
      ? (await staticFile(req.url)) ?? (await worker.fetch(request))
      : await worker.fetch(request, { ASSETS: assets });
    res.writeHead(webRes.status, webRes.statusText, [...webRes.headers]);
    const buf = Buffer.from(await webRes.arrayBuffer());
    res.end(buf);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Preview server error: ${err instanceof Error ? err.message : String(err)}`);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Production build preview (${provider}): http://localhost:${PORT}`);
});
