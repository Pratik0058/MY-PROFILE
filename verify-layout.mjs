import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const cwd = "C:\\Users\\P R A T I K\\Documents\\Codex\\2026-06-13\\built-a-website-of-me-with";
const profile = `${cwd}\\work\\chrome-cdp-profile`;
const url = "file:///C:/Users/P%20R%20A%20T%20I%20K/Documents/Codex/2026-06-13/built-a-website-of-me-with/outputs/index.html";
const port = 9339;
const mode = process.argv[2] === "desktop" ? "desktop" : "mobile";
const viewport = mode === "desktop"
  ? { width: 1440, height: 1000, mobile: false, output: "screenshot-desktop.png" }
  : { width: 390, height: 844, mobile: true, output: "screenshot-mobile.png" };

await rm(profile, { recursive: true, force: true });
await mkdir(profile, { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--disable-extensions",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--window-size=900,900",
  "about:blank"
], { stdio: ["ignore", "pipe", "pipe"] });

async function getJson(path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

let page;
for (let i = 0; i < 50; i += 1) {
  try {
    const tabs = await getJson("/json");
    page = tabs.find((tab) => tab.type === "page");
    if (page) break;
  } catch {
    await wait(100);
  }
}

if (!page) {
  chrome.kill();
  throw new Error("Chrome did not expose a page target");
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
});

function send(method, params = {}) {
  const messageId = ++id;
  ws.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: viewport.width,
  height: viewport.height,
  deviceScaleFactor: 1,
  mobile: viewport.mobile
});
await send("Page.navigate", { url });
await wait(2600);

const expression = `(() => {
  const pick = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const styles = getComputedStyle(el);
    return {
      selector,
      text: el.innerText || el.textContent || "",
      display: styles.display,
      widthStyle: styles.width,
      transform: styles.transform,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      opacity: styles.opacity
    };
  };
  return {
    viewport: { width: innerWidth, height: innerHeight },
    page: {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    },
    rects: [
      pick(".site-header"),
      pick(".brand"),
      pick(".nav-links"),
      pick(".nav-links a[href='#work']"),
      pick(".nav-links a[href='#skills']"),
      pick(".nav-links a[href='#contact']"),
      pick(".hero"),
      pick(".hero h1"),
      pick(".hero-copy"),
      pick(".hero-actions"),
      pick(".ticker")
    ],
    overflowChecks: Array.from(document.querySelectorAll(".project-card, .proof-card, .skill-row")).map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        selector: el.className,
        text: (el.innerText || "").slice(0, 80),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scrollWidth: el.scrollWidth,
        scrollHeight: el.scrollHeight,
        overflowX: el.scrollWidth > Math.ceil(rect.width),
        overflowY: el.scrollHeight > Math.ceil(rect.height)
      };
    })
  };
})()`;

const result = await send("Runtime.evaluate", {
  expression,
  returnByValue: true,
  awaitPromise: true
});

console.log(JSON.stringify(result.result.value, null, 2));
const screenshot = await send("Page.captureScreenshot", {
  format: "png",
  fromSurface: true
});
await writeFile(`${cwd}\\outputs\\${viewport.output}`, Buffer.from(screenshot.data, "base64"));
ws.close();
chrome.kill();
