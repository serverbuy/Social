#!/usr/bin/env node
/**
 * Render the Known Poll share card and favicon previews.
 * Stages files under /workspace/.grok/ — never public/.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const NEWSREADER = readFileSync("/workspace/.grok/brand-fonts/newsreader.woff2").toString("base64");
const PLEX = readFileSync("/workspace/.grok/brand-fonts/ibmplexmono.woff2").toString("base64");
const FAVICON = readFileSync("/workspace/.grok/favicon.svg.tmp", "utf8");

const cardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: "Newsreader";
  font-style: normal;
  font-weight: 500;
  src: url("data:font/woff2;base64,${NEWSREADER}") format("woff2");
}
@font-face {
  font-family: "IBM Plex Mono";
  font-style: normal;
  font-weight: 400;
  src: url("data:font/woff2;base64,${PLEX}") format("woff2");
}
html, body {
  margin: 0;
  width: 1200px;
  height: 630px;
  background: #080808;
  overflow: hidden;
}
.stage {
  position: relative;
  width: 1200px;
  height: 630px;
  background: #080808;
  display: flex;
  align-items: center;
  justify-content: center;
}
.frame {
  position: absolute;
  inset: 44px;
  border: 1px solid #f4f4f0;
  pointer-events: none;
}
.lockup {
  text-align: center;
  color: #f4f4f0;
  transform: translateY(-6px);
}
.wordmark {
  font-family: "Newsreader", "Times New Roman", serif;
  font-weight: 500;
  font-size: 168px;
  line-height: 0.86;
  letter-spacing: 0.06em;
  margin: 0;
  font-optical-sizing: none;
  font-variation-settings: "opsz" 72;
}
.wordmark span {
  display: block;
}
.wordmark .poll {
  letter-spacing: 0.22em;
  padding-left: 0.08em;
}
.tag {
  font-family: "IBM Plex Mono", ui-monospace, monospace;
  font-weight: 400;
  font-size: 15px;
  line-height: 1.2;
  letter-spacing: 0.16em;
  color: #8a8a86;
  margin: 42px 0 0;
}
</style>
</head>
<body>
  <div class="stage">
    <div class="frame" aria-hidden="true"></div>
    <div class="lockup">
      <h1 class="wordmark"><span>KNOWN</span><span class="poll">POLL</span></h1>
      <p class="tag">Status is public. Identity is permanent.</p>
    </div>
  </div>
</body>
</html>`;

const favHtml = (size) => `<!doctype html>
<html><head><meta charset="utf-8">
<style>
html,body{margin:0;width:${size}px;height:${size}px;background:#080808;overflow:hidden}
svg{display:block;width:${size}px;height:${size}px}
</style></head>
<body>${FAVICON}</body></html>`;

writeFileSync("/workspace/.grok/brand-stage/og-card.html", cardHtml);

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const card = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  await card.setContent(cardHtml, { waitUntil: "load" });
  await card.evaluate(async () => {
    await document.fonts.ready;
  });
  await card.waitForTimeout(200);
  await card.screenshot({
    path: "/workspace/.grok/brand-stage/og-card-2x.png",
    type: "png",
  });
  await card.close();

  for (const size of [16, 32, 64]) {
    const p = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await p.setContent(favHtml(size), { waitUntil: "load" });
    await p.screenshot({
      path: `/workspace/.grok/brand-stage/favicon-${size}.png`,
      type: "png",
    });
    await p.close();
  }
} finally {
  await browser.close();
}

console.log("rendered card + favicon previews");
