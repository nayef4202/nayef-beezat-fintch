import fs from "node:fs";
import path from "node:path";

/**
 * Fix for Rolldown / Vite build error on Linux (Render):
 * tr46 contains `require("punycode/")` with a trailing slash.
 * In Rolldown + unenv, this resolves to `unenv/dist/runtime/node/punycode.mjs/`
 * which causes "Not a directory (os error 20)" on Linux systems like Render.
 *
 * This script runs during postinstall and before `vite build` to strip the trailing slash.
 */
function walkAndPatch(dir) {
  if (!fs.existsSync(dir)) return;

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git") continue;
      walkAndPatch(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".js") ||
        entry.name.endsWith(".mjs") ||
        entry.name.endsWith(".cjs"))
    ) {
      if (
        fullPath.includes("tr46") ||
        fullPath.includes("whatwg-url") ||
        entry.name === "tr46.js"
      ) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          if (content.includes("punycode/")) {
            const patched = content
              .replace(/require\s*\(\s*["']punycode\/["']\s*\)/g, 'require("punycode")')
              .replace(/["']punycode\/["']/g, '"punycode"');
            fs.writeFileSync(fullPath, patched, "utf8");
            console.log(`[fix-punycode] Successfully patched trailing slash in: ${fullPath}`);
          }
        } catch (err) {
          console.warn(`[fix-punycode] Could not patch ${fullPath}:`, err.message);
        }
      }
    }
  }
}

try {
  const nodeModulesPath = path.resolve("node_modules");
  if (fs.existsSync(nodeModulesPath)) {
    walkAndPatch(nodeModulesPath);
    console.log("[fix-punycode] Finished patching punycode imports.");
  }
} catch (err) {
  console.warn("[fix-punycode] Script completed with warning:", err.message);
}
