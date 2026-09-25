/**
 * Checks the nginx container from docker-compose.yml the way a visitor (and
 * GitHub Pages) would: every sitemap URL resolves, missing pages get the
 * branded 404 with a real 404 status, sources are not exposed, responses are
 * compressed, and the security headers are present.
 *
 *   SITE_URL=http://localhost:8080 node scripts/verify-docker.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const base = (process.env.SITE_URL || "http://localhost:8080").replace(/\/$/, "");
const get = (path, headers = {}) => fetch(base + path, { headers, redirect: "manual" });

// 1. Security headers on HTML.
const home = await get("/");
assert.equal(home.status, 200);
const h = (name) => home.headers.get(name) || "";
assert.match(h("content-security-policy"), /script-src 'self'/);
assert.match(h("content-security-policy"), /frame-ancestors 'none'/);
assert.equal(h("x-content-type-options"), "nosniff");
assert.equal(h("x-frame-options"), "DENY");
assert.equal(h("referrer-policy"), "strict-origin-when-cross-origin");
assert.match(h("permissions-policy"), /camera=\(\)/);
assert.doesNotMatch(h("server"), /\d/, "server version must not be advertised");
assert.equal(h("cache-control"), "no-cache");

// 2. Every URL in the sitemap is served.
const sitemap = await (await get("/sitemap.xml")).text();
const paths = [...sitemap.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
assert(paths.length > 40, `expected the full sitemap, got ${paths.length} URLs`);
for (const path of paths) assert.equal((await get(path)).status, 200, path);

// 3. Branded 404 with the correct status code.
const missing = await get("/this-page-does-not-exist");
assert.equal(missing.status, 404);
assert.match(await missing.text(), /This page doesn’t exist/);

// 4. Source files, tooling and dotfiles are not published.
for (const path of ["/content/home.html", "/scripts/build.mjs", "/package.json", "/AGENTS.md", "/.git/config", "/assets/og-page.html"])
  assert.equal((await get(path)).status, 404, `${path} must not be served`);

// 5. Static assets: correct type, compressed, cacheable.
const css = await get("/assets/site.css", { "accept-encoding": "gzip" });
assert.equal(css.status, 200);
assert.match(css.headers.get("content-type"), /text\/css/);
assert.equal(css.headers.get("content-encoding"), "gzip");
assert.match(css.headers.get("cache-control") || "", /max-age=3600/);
const og = await get("/assets/og/tolling/s3-large-scale-bucket-migration.jpg");
assert.equal(og.status, 200);
assert.match(og.headers.get("content-type"), /image\/jpeg/);

// 6. The page each case study points at for social previews exists.
const index = JSON.parse(fs.readFileSync("assets/case-studies.json", "utf8"));
for (const item of index) {
  const html = await (await get("/" + item.url)).text();
  const image = html.match(/property="og:image" content="https:\/\/[^/]+(\/[^"]+)"/)[1];
  assert.equal((await get(image)).status, 200, `${item.url} social image ${image}`);
}

console.log(`PASS: container at ${base} — ${paths.length} sitemap URLs, security headers, 404 page, no source exposure, gzip, social images.`);
