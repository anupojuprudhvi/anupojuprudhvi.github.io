import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export function serve(port = 4173) {
  return http
    .createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const sendError = (status, message) => {
        res.writeHead(status, {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Length": Buffer.byteLength(message),
        });
        res.end(req.method === "HEAD" ? undefined : message);
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.setHeader("Allow", "GET, HEAD");
        sendError(405, "Method not allowed");
        return;
      }
      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        // Invalid escapes and decoded control characters must never reach fs.readFile.
        if (/[\u0000-\u001f\u007f]/.test(pathname)) throw new Error("Invalid path");
      } catch {
        sendError(400, "Bad request");
        return;
      }
      const filename = path.resolve(
        root,
        "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
      );
      if (!filename.startsWith(root + path.sep)) {
        sendError(403, "Forbidden");
        return;
      }
      fs.readFile(filename, (error, data) => {
        if (error) {
          if (["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) sendError(404, "Not found");
          else if (["EACCES", "EPERM"].includes(error.code)) sendError(403, "Forbidden");
          else {
            console.error("Preview file read failed:", error.code);
            sendError(500, "Unable to read file");
          }
          return;
        }
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css",
            ".js": "text/javascript",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".xml": "application/xml; charset=utf-8",
            ".txt": "text/plain; charset=utf-8",
          }[path.extname(filename)] || "application/octet-stream",
        );
        res.setHeader("Content-Length", data.length);
        res.end(req.method === "HEAD" ? undefined : data);
      });
    })
    .listen(port, "127.0.0.1");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve();
  console.log("Preview: http://127.0.0.1:4173");
}
