// Loads app.js into a sandbox with just enough fake browser to run its logic.
// Returns the sandbox so tests can call app functions (num, conc, logDose...) directly.
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const SRC = fs.readFileSync(path.join(ROOT, "app.js"), "utf8");

function fakeEl() {
  return {
    innerHTML: "", textContent: "", value: "", style: {}, className: "",
    getAttribute() { return null; }, setAttribute() {}, remove() {},
    appendChild() {}, addEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    parentElement: null,
  };
}

function loadApp(stored, opts) {
  opts = opts || {};
  const store = new Map();
  if (stored !== undefined) store.set("stack_v1", JSON.stringify(stored));
  const app = fakeEl();
  const ctx = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    location: { hash: opts.hash || "" },
    navigator: {},
    document: {
      getElementById: (id) => (id === "app" ? app : null),
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: fakeEl,
      body: fakeEl(),
    },
    alert() {}, scrollTo() {},
  };
  ctx.window = ctx;
  ctx.addEventListener = () => {};
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "app.js" });
  ctx.__app = app;
  ctx.__store = store;
  ctx.__saved = () => JSON.parse(store.get("stack_v1"));
  return ctx;
}

module.exports = { loadApp, ROOT };
