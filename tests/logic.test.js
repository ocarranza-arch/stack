// Regression tests for Stack's core logic. Run: npm test
// Each test names the bug or checklist item it guards. If one fails, the change broke something that used to work.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { loadApp, ROOT } = require("./harness");

const plain = (x) => JSON.parse(JSON.stringify(x));
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: expected ${b}, got ${a}`);

// Fixture: one of each kind of compound and med, with decimals and 9s on purpose.
function seed() {
  return {
    compounds: [
      { id: "bpc", name: "BPC-157", mode: "powder", vialMg: 10, bacMl: 2, doseMg: 0.25, units: "mg", freq: "daily", start: "2026-10-01", time: "09:00", remainingMl: 1.95 },
      { id: "tst", name: "Test Cyp", mode: "liquid", mgPerMl: 200, vialMl: 10, doseMg: 100, units: "mg", freq: "2xw", days: [1, 4], start: "2026-10-01", remainingMl: 9.5 },
      { id: "mcg", name: "Ipamorelin", mode: "powder", vialMg: 5, bacMl: 2.5, doseMg: 250, units: "mcg", freq: "eod", start: "2026-10-01", remainingMl: 2.5 },
      { id: "iu", name: "HGH", mode: "powder", vialMg: 10, bacMl: 1, doseMg: 2, units: "IU", freq: "weekly", start: "2026-10-01", remainingMl: 1 },
      { id: "prn", name: "PRN pep", mode: "powder", vialMg: 5, bacMl: 2, doseMg: 0.5, units: "mg", freq: "prn", start: "2026-10-01", remainingMl: 2 },
    ],
    meds: [
      { name: "Doxycycline", dose: "100 mg", times: ["10:00"] },
      { name: "Propranolol", dose: "10 mg", times: [] },
      { name: "Viagra", dose: "50 mg", times: [] },
    ],
    storage: [{ n: "BAC water", qty: 1.5, unit: "vials" }],
    done: {}, skips: {}, medLog: {}, oneoff: [], body: [], labs: [], sites: [],
    settings: { unitsPerMl: 100 }, protocols: [],
  };
}
const byId = (app, id) => app.S.compounds.find((c) => c.id === id);

// ---------- Number parsing (bug: v17 split turned [^0-9.] into [-9.]) ----------
test("num() keeps decimals and the digit 9", () => {
  const { num } = loadApp(seed());
  const cases = { "2.5": 2.5, "0.25": 0.25, "19": 19, "99": 99, "250 mg": 250, "1,5": 1.5, "": 0, "abc": 0 };
  for (const [input, want] of Object.entries(cases)) assert.equal(num(input), want, `num(${JSON.stringify(input)})`);
  assert.equal(num(0.25), 0.25);
  assert.equal(num(null), 0);
  assert.equal(num(undefined), 0);
});

test("opening the app does not change saved numbers (load is idempotent)", () => {
  const original = seed();
  const a = loadApp(original);
  const c = byId(a, "bpc");
  assert.equal(c.doseMg, 0.25);
  assert.equal(c.remainingMl, 1.95);
  assert.equal(byId(a, "mcg").bacMl, 2.5);
  assert.equal(a.S.storage[0].qty, 1.5);
  // Open it again from what was saved: nothing may drift.
  a.save();
  const b = loadApp(a.__saved());
  assert.deepEqual(plain(b.S.compounds), plain(a.S.compounds));
  const c2 = loadApp(b.__saved());
  assert.deepEqual(plain(c2.S.compounds), plain(a.S.compounds));
});

test("Oscar's case: 1.6 mg stays 1.6 mg across opens and releases, and shows 32 units (was 16 mg / 320 u)", () => {
  const s = seed();
  s.compounds.push({ id: "x16", name: "Case 1.6", mode: "powder", vialMg: 10, bacMl: 2, doseMg: 1.6, units: "mg", freq: "daily", start: "2026-10-01", remainingMl: 2 });
  let a = loadApp(s);
  for (let open = 0; open < 5; open++) { a.save(); a = loadApp(a.__saved()); }
  const c = byId(a, "x16");
  assert.equal(c.doseMg, 1.6);
  near(a.unitsFor(c, c.doseMg), 32, "units");
  assert.equal(a.doseLine(c, c.doseMg), "32 u · 0.32 mL");
  // Saved as a string (as older builds and imports sometimes did) must parse the same.
  near(a.unitsFor(c, "1.6"), 32, "units from string");
  // Other decimal shapes
  for (const [d, u] of [[0.1, 2], [0.75, 15], [1.25, 25], [2.4, 48], [9.9, 198]]) near(a.unitsFor(c, d), u, `${d} mg`);
});

// ---------- Dose math (checklist: units and mL must agree, units = mL x 100) ----------
test("powder mg: 0.25 mg from 10 mg / 2 mL = 0.05 mL = 5 units", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  near(a.conc(c), 5, "mg/mL");
  near(a.mlFor(c, 0.25), 0.05, "mL");
  near(a.unitsFor(c, 0.25), 5, "units");
});

test("liquid mg: 100 mg at 200 mg/mL = 0.5 mL = 50 units", () => {
  const a = loadApp(seed()); const c = byId(a, "tst");
  near(a.mlFor(c, 100), 0.5, "mL");
  near(a.unitsFor(c, 100), 50, "units");
});

test("mcg: 250 mcg from 5 mg / 2.5 mL = 0.125 mL = 12.5 units", () => {
  const a = loadApp(seed()); const c = byId(a, "mcg");
  near(a.mlFor(c, 250), 0.125, "mL");
  near(a.unitsFor(c, 250), 12.5, "units");
});

test("IU: 2 IU from 10 IU / 1 mL = 0.2 mL = 20 units", () => {
  const a = loadApp(seed()); const c = byId(a, "iu");
  near(a.mlFor(c, 2), 0.2, "mL");
  near(a.unitsFor(c, 2), 20, "units");
});

test("units always equal mL x 100 for every compound type", () => {
  const a = loadApp(seed());
  for (const c of a.S.compounds) {
    for (const dose of [0.1, 0.25, 1, 2, 9.9, 100, 250]) {
      near(a.unitsFor(c, dose), Math.round(a.mlFor(c, dose) * 100 * 100) / 100, `${c.name} @ ${dose}`);
    }
  }
});

test("dose label shows mL to 2 decimals so it matches the units", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  assert.equal(a.doseLine(c, 0.25), "5 u · 0.05 mL");
});

test("dose screen pre-fills the exact dose, not a rounded one (bug: 0.25 logged as 0.3)", () => {
  const a = loadApp(seed());
  let html = "";
  a.document.createElement = () => ({ set innerHTML(v) { html = v; }, get innerHTML() { return html; } });
  a.document.body.appendChild = () => {};
  a.document.getElementById = (id) => (id === "app" ? a.__app : id === "mdl" ? null : { value: "", textContent: "" });
  a.doseModal("bpc", a.today());
  assert.match(html, /id="dm"[^>]*value="0\.25"/);
});

test("no concentration set returns 0, not NaN or Infinity", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  c.vialMg = 0;
  assert.equal(a.unitsFor(c, 0.25), 0);
  assert.equal(a.mlFor(c, 0.25), 0);
  assert.equal(a.dosesLeft(c), null);
});

// ---------- Logging and inventory (checklist: log decrements, undo restores) ----------
test("logging a dose subtracts mL from inventory and undo puts it back", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  assert.equal(a.logDose("bpc", "2026-10-20", 0.25), true);
  near(c.remainingMl, 1.9, "after log");
  assert.equal(a.S.done["2026-10-20"].bpc.mg, 0.25);
  a.undoDose("bpc", "2026-10-20");
  near(c.remainingMl, 1.95, "after undo");
  assert.equal(a.isDone("2026-10-20", "bpc"), false);
});

test("re-logging the same day adjusts inventory by the difference only", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  a.logDose("bpc", "2026-10-20", 0.25);
  a.logDose("bpc", "2026-10-20", 0.5);
  near(c.remainingMl, 1.85, "inventory");
});

test("moving a logged dose to another date", () => {
  const a = loadApp(seed());
  a.logDose("bpc", "2026-10-20", 0.25);
  a.logDose("bpc", "2026-10-22", 0.25);
  assert.equal(a.moveDose("bpc", "2026-10-20", "2026-10-22"), "occupied");
  assert.equal(a.moveDose("bpc", "2026-10-20", "2026-10-21"), "ok");
  assert.equal(a.isDone("2026-10-21", "bpc"), true);
  assert.equal(a.isDone("2026-10-20", "bpc"), false);
});

// ---------- Scheduling ----------
test("schedules: daily, every other day, twice weekly, weekly, PRN", () => {
  const a = loadApp(seed());
  // 2026-10-01 is a Thursday.
  assert.equal(a.occurs(byId(a, "bpc"), "2026-10-02"), true, "daily");
  assert.equal(a.occurs(byId(a, "bpc"), "2026-09-30"), false, "before start");
  assert.equal(a.occurs(byId(a, "mcg"), "2026-10-03"), true, "eod day 2");
  assert.equal(a.occurs(byId(a, "mcg"), "2026-10-04"), false, "eod day 3");
  assert.equal(a.occurs(byId(a, "tst"), "2026-10-05"), true, "2xw Monday");
  assert.equal(a.occurs(byId(a, "tst"), "2026-10-06"), false, "2xw Tuesday");
  assert.equal(a.occurs(byId(a, "iu"), "2026-10-08"), true, "weekly Thursday");
  assert.equal(a.occurs(byId(a, "iu"), "2026-10-09"), false, "weekly Friday");
  assert.equal(a.occurs(byId(a, "prn"), "2026-10-02"), false, "PRN never scheduled");
});

test("paused compound still shows on past days it was logged (checklist)", () => {
  const a = loadApp(seed()); const c = byId(a, "bpc");
  a.logDose("bpc", "2026-10-10", 0.25);
  c.paused = true;
  assert.equal(a.occurs(c, "2026-10-10"), true, "logged day stays");
  assert.equal(a.occurs(c, "2026-10-11"), false, "unlogged day hidden");
});

// ---------- Views ----------
test("PRN meds appear under As needed, not Medications (checklist)", () => {
  const a = loadApp(seed());
  const asNeeded = a.viewAsNeeded();
  const meds = a.viewMedsToday();
  for (const name of ["Propranolol", "Viagra"]) {
    assert.ok(asNeeded.includes(name), `${name} in As needed`);
    assert.ok(!meds.includes(name), `${name} not in Medications`);
  }
  assert.ok(meds.includes("Doxycycline"));
});

test("a logged dose on Today shows its real dose, not the date (bug: swapped arguments)", () => {
  const a = loadApp(seed());
  a.logDose("bpc", a.today(), 0.25);
  const html = a.viewToday();
  assert.ok(html.includes("5 u · 0.05 mL"), "logged row shows 5 u");
  assert.ok(html.includes(`data-dose="bpc|${a.today()}"`), "tap target points at today, not at the dose");
  assert.ok(!/\d{6,} u/.test(html), "no date rendered as a dose");
});

test("every tab renders without the error box", () => {
  const tabs = ["today", "cal", "body", "labs", "sites", "inv", "storage", "meds", "conf", "sync", "tools", "more"];
  for (const t of tabs) {
    const a = loadApp(seed(), { hash: "#" + t });
    a.logDose("bpc", a.today(), 0.25);
    a.render();
    assert.ok(a.__app.innerHTML.length > 50, `${t} rendered`);
    assert.ok(!a.__app.innerHTML.includes("hit an error"), `${t} has no error: ${a.__app.innerHTML.slice(0, 300)}`);
  }
});

test("app starts cleanly with no saved data", () => {
  const a = loadApp(undefined);
  assert.ok(!a.__app.innerHTML.includes("hit an error"));
  assert.ok(a.S.sites.length > 0 && a.S.labs.length > 0);
});

// ---------- Release hygiene ----------
test("BUILD in app.js matches the service worker cache name", () => {
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  const build = app.match(/var BUILD="(v[\d.]+)"/)[1];
  const cache = sw.match(/const C="stack-(v[\d.]+)"/)[1];
  assert.equal(cache, build, "run: npm run bump");
});

test("Calendar is the second nav slot (checklist)", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const hrefs = [...html.matchAll(/<nav>[\s\S]*?<\/nav>/g)][0][0].match(/href="#\w+"/g);
  assert.deepEqual(hrefs, ['href="#today"', 'href="#cal"', 'href="#body"', 'href="#sites"', 'href="#more"']);
});

test("index.html loads files that exist, and the service worker is registered", () => {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  for (const f of ["manifest.json", "styles.css", "app.js"]) {
    assert.ok(html.includes(f), `index.html references ${f}`);
    assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} exists`);
  }
  const app = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");
  assert.ok(/serviceWorker\.register\(/.test(app), "sw.js is registered");
});
