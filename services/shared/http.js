import { createServer } from "node:http";
import { URL } from "node:url";

export function createJsonServer({ port, name, routes }) {
  const server = createServer(async (req, res) => {
    try {
      addCorsHeaders(res);
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);
      const body = await parseBody(req);
      const result = await routes({ req, res, url, body });
      if (res.writableEnded) {
        return;
      }
      if (!result) {
        sendJson(res, 404, { message: `${name} route not found` });
        return;
      }
      sendJson(res, result.status ?? 200, result.body ?? {});
    } catch (error) {
      sendJson(res, 500, {
        message: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`${name} listening on http://0.0.0.0:${port}`);
  });
}

export async function readJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message || `Request failed: ${response.status}`);
  }
  return body;
}

export function sendJson(res, status, payload) {
  addCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

export function addCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function parseBody(req) {
  if (req.method === "GET" || req.method === "HEAD") {
    return null;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return null;
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}
