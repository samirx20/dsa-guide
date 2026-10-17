// Usage: node scripts/check-lab.mjs src/labs/dsa/FooLab.jsx [...more]
// Syntax-checks JSX files and verifies their imports resolve, without a full build.
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { transformWithOxc } from "vite";

const ROOT = resolve(import.meta.dirname, "..");
const pkgs = new Set(Object.keys(JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8")).dependencies));
let failed = false;

for (const f of process.argv.slice(2)) {
  const file = resolve(ROOT, f);
  try {
    const src = readFileSync(file, "utf8");
    await transformWithOxc(src, file, { jsx: { runtime: "automatic" } });
    for (const [, spec] of src.matchAll(/from\s+["']([^"']+)["']/g)) {
      if (spec.startsWith("@/")) {
        const base = resolve(ROOT, "src", spec.slice(2));
        if (![".jsx", ".js", "/index.js", ""].some((e) => existsSync(base + e) && (e || base.match(/\.\w+$/))))
          throw new Error(`unresolved import ${spec}`);
      } else if (spec.startsWith(".")) {
        const base = resolve(dirname(file), spec);
        if (![".jsx", ".js", ""].some((e) => existsSync(base + e))) throw new Error(`unresolved import ${spec}`);
      } else {
        const name = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
        if (!pkgs.has(name) && name !== "react") throw new Error(`package not in dependencies: ${name}`);
      }
    }
    if (!/export default/.test(src)) throw new Error("missing default export");
    console.log(`ok   ${f}`);
  } catch (e) {
    failed = true;
    console.log(`FAIL ${f}\n     ${String(e.message ?? e).split("\n").slice(0, 6).join("\n     ")}`);
  }
}
process.exit(failed ? 1 : 0);
