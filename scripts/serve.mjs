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
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const filename = path.resolve(
        root,
        "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
      );
      if (!filename.startsWith(root + path.sep)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(filename, (error, data) => {
        if (error) {
          res.writeHead(404).end("Not found");
          return;
        }
        res.setHeader(
          "Content-Type",
          {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css",
            ".js": "text/javascript",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".xml": "application/xml; charset=utf-8",
            ".txt": "text/plain; charset=utf-8",
          }[path.extname(filename)] || "application/octet-stream",
        );
        res.end(data);
      });
    })
    .listen(port, "127.0.0.1");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  serve();
  console.log("Preview: http://127.0.0.1:4173");
}
