import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { serve } from "./serve.mjs";

test("preview handles invalid requests without interrupting normal browsing", async () => {
  const server = serve(0);
  await once(server, "listening");
  const request = (pathname, method = "GET") => new Promise((resolve, reject) => {
    // Send the raw path so the HTTP client does not normalize traversal test cases.
    const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path: pathname, method }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end();
  });
  try {
    for (const pathname of ["/%", "/%ZZ", "/%E0%A4", "/%00", "/%0a"]) {
      const response = await request(pathname);
      assert.equal(response.status, 400, pathname);
      assert.equal(response.body, "Bad request");
      assert.equal((await request("/")).status, 200, "preview must survive invalid input");
    }
    assert.equal((await request("/%2e%2e%2foutside.txt")).status, 403);
    assert.equal((await request("/definitely-not-a-page.html")).status, 404);
    for (const method of ["POST", "PUT", "DELETE", "OPTIONS"]) {
      const response = await request("/", method);
      assert.equal(response.status, 405);
      assert.equal(response.headers.allow, "GET, HEAD");
    }
    const get = await request("/index.html?preview=1");
    const head = await request("/index.html?preview=1", "HEAD");
    assert.equal(get.status, 200);
    assert.equal(head.status, get.status);
    assert.equal(head.body, "");
    assert.equal(head.headers["content-length"], String(Buffer.byteLength(get.body)));
    assert.equal(head.headers["content-type"], get.headers["content-type"]);
    assert.equal(get.headers["cache-control"], "no-store");
    assert.equal(get.headers["x-content-type-options"], "nosniff");
    for (const [pathname, status] of [["/%ZZ", 400], ["/missing.html", 404]]) {
      const response = await request(pathname, "HEAD");
      assert.equal(response.status, status);
      assert.equal(response.body, "");
    }
    for (const [pathname, type] of [
      ["/case-studies/", "text/html"],
      ["/assets/case-studies.json", "application/json"],
      ["/assets/site.css", "text/css"],
      ["/assets/theme.js", "text/javascript"],
      ["/sitemap.xml", "application/xml"],
      ["/robots.txt", "text/plain"],
    ]) {
      const response = await request(pathname);
      assert.equal(response.status, 200, pathname);
      assert(response.headers["content-type"].startsWith(type), pathname);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
