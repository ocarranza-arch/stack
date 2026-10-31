// Sets the same version in app.js (BUILD) and sw.js (cache name) so they can never drift.
// Usage: npm run bump            -> v18.6 becomes v18.7
//        npm run bump -- v19      -> sets v19
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const appP = path.join(root, "app.js"), swP = path.join(root, "sw.js");
let app = fs.readFileSync(appP, "utf8"), sw = fs.readFileSync(swP, "utf8");
const cur = app.match(/var BUILD="v([\d.]+)"/)[1];
let next = process.argv[2];
if (!next) {
  const parts = cur.split(".").map(Number);
  if (parts.length === 1) parts.push(1); else parts[parts.length - 1]++;
  next = parts.join(".");
}
next = String(next).replace(/^v/, "");
if (!/^\d+(\.\d+)*$/.test(next)) { console.error("Bad version: " + next); process.exit(1); }
app = app.replace(/var BUILD="v[\d.]+"/, `var BUILD="v${next}"`);
sw = sw.replace(/const C="stack-v[\d.]+"/, `const C="stack-v${next}"`);
fs.writeFileSync(appP, app);
fs.writeFileSync(swP, sw);
console.log(`v${cur} -> v${next} (app.js + sw.js)`);
