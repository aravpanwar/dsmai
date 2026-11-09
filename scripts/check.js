// Validates assets/js/data.js: unique ids, known needs, left-to-right
// dependencies, no cycles. Run with `node scripts/check.js`.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "assets", "js", "data.js");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
const { layers, nodes } = sandbox.window.DSMAI;

const problems = [];
const rank = new Map(layers.map((l, i) => [l.id, i]));
const byId = new Map();

for (const n of nodes) {
  if (byId.has(n.id)) problems.push(`expected unique ids, saw "${n.id}" twice`);
  byId.set(n.id, n);
  if (!rank.has(n.layer)) problems.push(`expected a known layer for "${n.id}", got "${n.layer}"`);
  if (!n.text) problems.push(`expected a description for "${n.id}"`);
  for (const field of ["label", "text", "aka"]) {
    if (/[\u2013\u2014]/.test(n[field] || "")) problems.push(`expected plain hyphens in ${field} of "${n.id}"`);
  }
}

for (const n of nodes) {
  for (const p of n.needs) {
    const dep = byId.get(p);
    if (!dep) { problems.push(`expected a known node "${p}" in the needs of "${n.id}"`); continue; }
    if (rank.get(dep.layer) > rank.get(n.layer)) {
      problems.push(`refusing a forward dependency: "${n.id}" (${n.layer}) needs "${p}" (${dep.layer})`);
    }
  }
}

// Same-layer needs are allowed, so cycles can only form inside a layer, but a
// full DFS is cheap and catches them wherever they appear.
const state = new Map();
function visit(id, trail) {
  if (state.get(id) === 2) return;
  if (state.get(id) === 1) { problems.push(`expected no cycles, found ${[...trail, id].join(" > ")}`); return; }
  state.set(id, 1);
  for (const p of (byId.get(id) || { needs: [] }).needs) visit(p, [...trail, id]);
  state.set(id, 2);
}
for (const n of nodes) visit(n.id, []);

const used = new Set(nodes.flatMap((n) => n.needs));
const loose = nodes.filter((n) => n.needs.length === 0 && !used.has(n.id));
for (const n of loose) problems.push(`expected "${n.id}" to connect to something`);

const edges = nodes.reduce((s, n) => s + n.needs.length, 0);
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}
console.log(`${nodes.length} concepts, ${edges} dependencies, ${layers.length} layers: ok`);
for (const l of layers) {
  console.log(`  ${l.name.padEnd(14)} ${nodes.filter((n) => n.layer === l.id).length}`);
}
