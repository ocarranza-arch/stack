// Real-browser smoke test: serves the repo, opens the app in Chromium at iPhone size, taps through it.
// Run: npm run test:smoke   (exits non-zero on any failure)
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/^\/$/, "/index.html"));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

const seed = {
  compounds: [
    { id: "bpc", name: "BPC-157", mode: "powder", vialMg: 10, bacMl: 2, doseMg: 0.25, units: "mg", freq: "daily", start: "2026-01-01", time: "09:00", remainingMl: 2 },
    { id: "prn", name: "PRN pep", mode: "powder", vialMg: 5, bacMl: 2, doseMg: 0.5, units: "mg", freq: "prn", start: "2026-01-01", remainingMl: 2 },
  ],
  meds: [{ name: "Doxycycline", dose: "100 mg", times: ["10:00"] }, { name: "Propranolol", dose: "10 mg", times: [] }],
  storage: [], done: {}, skips: {}, medLog: {}, oneoff: [], body: [], labs: [], sites: [], settings: { unitsPerMl: 100 }, protocols: [],
};

const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ok   " : "  FAIL ") + msg); if (!ok) fails.push(msg); };

(async () => {
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.dismiss());
  await page.addInitScript((s) => { if (!localStorage.getItem("stack_v1")) localStorage.setItem("stack_v1", JSON.stringify(s)); }, seed);

  await page.goto(url);
  const noErr = async (where) => check(!(await page.locator("text=hit an error").count()), `${where}: no error box`);

  // Today
  await noErr("Today");
  check((await page.textContent("#app")).includes("5 u · 0.05 mL"), "Today: BPC shows 5 u · 0.05 mL");
  await page.click('[data-log="bpc"]');
  await noErr("Today after logging first dose of the day");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("stack_v1")));
  const bpc = saved.compounds.find((c) => c.id === "bpc");
  check(Math.abs(bpc.remainingMl - 1.95) < 1e-9, `inventory 2 → 1.95 mL (got ${bpc.remainingMl})`);
  check((await page.textContent("#app")).includes("5 u · 0.05 mL · logged"), "logged row shows the dose");

  // Dose modal keeps the exact dose
  await page.click('button[data-dose^="bpc|"]');
  check((await page.inputValue("#dm")) === "0.25", "dose screen pre-fills 0.25 (not 0.3)");
  await page.click("#dcancel");

  // Undo restores inventory
  await page.click('[data-undo="bpc"]');
  const after = (await page.evaluate(() => JSON.parse(localStorage.getItem("stack_v1")))).compounds.find((c) => c.id === "bpc");
  check(Math.abs(after.remainingMl - 2) < 1e-9, `undo restores 2 mL (got ${after.remainingMl})`);

  // PRN placement
  const asNeeded = await page.locator(".card", { hasText: "As needed" }).textContent();
  check(asNeeded.includes("Propranolol"), "Propranolol under As needed");

  // Every tab
  for (const t of ["cal", "body", "sites", "more", "inv", "storage", "meds", "labs", "conf", "sync", "tools"]) {
    await page.goto(url + "#" + t);
    await noErr("#" + t);
  }
  // Calendar: tap today, check off from there
  await page.goto(url + "#cal");
  await page.click(".cal .d.tod");
  await page.click('[data-logday^="bpc|"]');
  await noErr("Calendar after logging a day");
  await page.click("#calNext"); await page.click("#calPrev");
  await noErr("Calendar prev/next");

  // Build string and service worker
  await page.goto(url + "#tools");
  const build = fs.readFileSync(path.join(ROOT, "app.js"), "utf8").match(/var BUILD="(v[\d.]+)"/)[1];
  check((await page.textContent("header")).includes(build), `Tools shows Build ${build}`);
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r; });
  check(sw, "service worker registered");

  check(errors.length === 0, "no uncaught page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  server.close();
  console.log(fails.length ? `\n${fails.length} smoke check(s) failed` : "\nSmoke test passed");
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
