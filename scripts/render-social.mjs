import { chromium } from "playwright";
import fs from "node:fs";
import { serve } from "./serve.mjs";
const server = serve(0);
await new Promise((resolve) => server.once("listening", resolve));
const executablePath = [
  process.env.BROWSER_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((p) => p && fs.existsSync(p));
const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    `http://127.0.0.1:${server.address().port}/assets/og-template.html`,
  );
  await page.screenshot({ path: "og-image.png" });
} finally {
  await browser.close();
  server.close();
}
