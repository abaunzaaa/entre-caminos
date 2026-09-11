import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { once } from "node:events";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9341;
const VIEWPORTS = [
  [1366, 600],
  [1366, 768],
  [1440, 900],
  [1536, 864],
  [1920, 1080],
];
const PAGES = ["register", "login"];

function waitForPort(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = createConnection({ host: "127.0.0.1", port }, () => {
        socket.end();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${port} did not open`));
          return;
        }
        setTimeout(tryOnce, 150);
      });
    };
    tryOnce();
  });
}

async function cdpHttp(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

async function withPage(fn) {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      "--remote-debugging-address=127.0.0.1",
      "--user-data-dir=C:\\Users\\julia\\Desktop\\entre-caminos\\.tmp-auth-verify\\chrome-measure-profile-2",
      "about:blank",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  try {
    await waitForPort(PORT);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const tabs = await cdpHttp("/json/list");
    const tab = tabs.find((item) => item.type === "page") ?? tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await once(ws, "open");
    let nextId = 1;
    const pending = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    await fn(send);
    ws.close();
  } finally {
    chrome.kill();
  }
}

const MEASURE_JS = `(() => {
  const stage = document.querySelector(".auth-stage");
  const pane = document.querySelector(".auth-form-pane:not([aria-hidden='true'])");
  const form = pane?.querySelector(".auth-form") || document.querySelector(".auth-form");
  const brandWrap = form?.querySelector(".auth-form__brand");
  const brand = brandWrap?.querySelector("img");
  const title = form?.querySelector(".auth-form__title");
  const google = form?.querySelector(".auth-social__google");
  const backPanel = document.querySelector(".auth-back--panel");
  const backPhoto = document.querySelector(".auth-back--photo");
  const visual = document.querySelector(".auth-visual-pane");
  const fields = [...(form?.querySelectorAll(".auth-field") ?? [])];
  const label = fields[0]?.querySelector(".auth-field__label");
  const control = fields[0]?.querySelector(".auth-field__control");
  const submit = form?.querySelector(".auth-submit");
  const footer = form?.querySelector(".auth-form__footer");
  const brandBox = (brand && brand.getBoundingClientRect().height > 1 ? brand : brandWrap)?.getBoundingClientRect();
  const brandDisplay = brandWrap ? getComputedStyle(brandWrap).display : null;
  const titleBox = title?.getBoundingClientRect();
  const formBox = form?.getBoundingClientRect();
  const googleBox = google?.getBoundingClientRect();
  const backPanelBox = backPanel?.getBoundingClientRect();
  const backPhotoBox = backPhoto?.getBoundingClientRect();
  const visualBox = visual?.getBoundingClientRect();
  const labelBox = label?.getBoundingClientRect();
  const controlBox = control?.getBoundingClientRect();
  const field0 = fields[0]?.getBoundingClientRect();
  const field1 = fields[1]?.getBoundingClientRect();
  const submitBox = submit?.getBoundingClientRect();
  const footerBox = footer?.getBoundingClientRect();
  const fieldGrid = form?.querySelector(".auth-form__fields");
  const titleCenter = titleBox ? titleBox.left + titleBox.width / 2 : null;
  const formCenter = formBox ? formBox.left + formBox.width / 2 : null;
  return {
    inner: { w: window.innerWidth, h: window.innerHeight },
    scroll: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
    bodyScroll: { w: document.body.scrollWidth, h: document.body.scrollHeight },
    logo: brandBox && {
      top: Number(brandBox.top.toFixed(1)),
      bottom: Number(brandBox.bottom.toFixed(1)),
      height: Number(brandBox.height.toFixed(1)),
      width: Number(brandBox.width.toFixed(1)),
      clipped: brandBox.top < -0.5,
      display: brandDisplay,
    },
    title: title?.textContent?.trim(),
    titleCenterOffset: titleCenter != null && formCenter != null ? Number((titleCenter - formCenter).toFixed(1)) : null,
    google: googleBox && {
      top: Number(googleBox.top.toFixed(1)),
      bottom: Number(googleBox.bottom.toFixed(1)),
      visible: googleBox.bottom <= window.innerHeight + 0.5 && googleBox.top >= -0.5,
    },
    backPanel: backPanelBox && {
      visible: getComputedStyle(backPanel).visibility !== "hidden" && getComputedStyle(backPanel).display !== "none",
      left: Number(backPanelBox.left.toFixed(1)),
      top: Number(backPanelBox.top.toFixed(1)),
      onPhoto: visualBox ? backPanelBox.left >= visualBox.left - 1 && backPanelBox.right <= visualBox.right + 1 && getComputedStyle(backPanel).visibility !== "hidden" : null,
    },
    backPhoto: backPhotoBox && {
      visible: getComputedStyle(backPhoto).visibility !== "hidden" && getComputedStyle(backPhoto).display !== "none",
      left: Number(backPhotoBox.left.toFixed(1)),
      top: Number(backPhotoBox.top.toFixed(1)),
    },
    visualLeft: visualBox ? Number(visualBox.left.toFixed(1)) : null,
    labelFieldGap: labelBox && controlBox ? Number((controlBox.top - labelBox.bottom).toFixed(1)) : null,
    fieldGap: field0 && field1 ? Number((field1.top - field0.bottom).toFixed(1)) : null,
    titleFormGap: titleBox && field0 ? Number((field0.top - titleBox.bottom).toFixed(1)) : null,
    logoTitleGap: brandBox && titleBox ? Number((titleBox.top - brandBox.bottom).toFixed(1)) : null,
    submitFooterGap: submitBox && footerBox ? Number((footerBox.top - submitBox.bottom).toFixed(1)) : null,
    fieldColumns: fieldGrid ? getComputedStyle(fieldGrid).gridTemplateColumns : null,
    twoCol: fieldGrid ? getComputedStyle(fieldGrid).gridTemplateColumns.split(" ").filter(Boolean).length >= 2 : false,
  };
})()`;

const results = [];
await withPage(async (send) => {
  await send("Page.enable");
  await send("Runtime.enable");
  for (const page of PAGES) {
    for (const [width, height] of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send("Page.navigate", { url: `http://127.0.0.1:5173/${page}` });
      let ready = null;
      for (let i = 0; i < 20; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const probe = await send("Runtime.evaluate", {
          expression:
            "({ hasForm: !!document.querySelector('.auth-form'), title: document.title, href: location.href, htmlLen: document.body?.innerHTML.length ?? 0, snippet: (document.body?.innerText || '').slice(0, 180) })",
          returnByValue: true,
        });
        ready = probe.result?.value;
        if (ready?.hasForm) break;
      }
      const evaluated = await send("Runtime.evaluate", {
        expression: MEASURE_JS,
        returnByValue: true,
        awaitPromise: false,
      });
      results.push({ page, width, height, ready, data: evaluated.result?.value ?? evaluated });
    }
  }
});

console.log(JSON.stringify(results, null, 2));
