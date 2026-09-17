// Sums the gzipped size of every script a modern browser loads on the home page before
// interaction (noModule polyfills excluded), and reports the largest lazy chunk (the hero
// layer). Fails over the limit. See docs/decisions/0002-initial-js-budget.md for the number.
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const LIMIT_KB = 150;
const html = readFileSync(".next/server/app/index.html", "utf8");
const tags = [...html.matchAll(/<script([^>]*)>/g)].map((m) => m[1]);
const initial = [
  ...new Set(
    tags
      .filter((attrs) => !/\bnoModule\b/i.test(attrs))
      .map((attrs) => attrs.match(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/)?.[1])
      .filter(Boolean),
  ),
];

const gz = (rel) => gzipSync(readFileSync(path.join(".next", rel.replace(/^\/_next\//, "")))).length;
let initialBytes = 0;
for (const s of initial) {
  const bytes = gz(s);
  initialBytes += bytes;
  console.log(`  ${(bytes / 1024).toFixed(1).padStart(6)} KB  ${s.split("/").pop()}`);
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : d.name.endsWith(".js") ? [path.join(dir, d.name)] : [],
  );
}
let lazy = { name: "", bytes: 0 };
for (const f of walk(".next/static/chunks")) {
  const rel = "/_next/" + path.relative(".next", f).split(path.sep).join("/");
  if (initial.includes(rel)) continue;
  const bytes = gzipSync(readFileSync(f)).length;
  if (bytes > lazy.bytes) lazy = { name: rel, bytes };
}

console.log(`initial JS on / (modern browsers): ${(initialBytes / 1024).toFixed(1)} KB gzipped in ${initial.length} chunks (limit ${LIMIT_KB} KB)`);
console.log(`largest lazy chunk: ${lazy.name.split("/").pop()} ${(lazy.bytes / 1024).toFixed(1)} KB gzipped`);
if (initialBytes > LIMIT_KB * 1024) {
  console.error("FAIL: initial JS over budget");
  process.exit(1);
}
