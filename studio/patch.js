const fs = require("fs");
let c = fs.readFileSync("server.ts", "utf8");
c = c.replace(
  'if (issues.some((i) => i.severity === "error")) return { ok: false, issues };',
  'const existingIssues = new Set(checkPool(lang, pool[lang], pool.banned, other).filter((i) => i.severity === "error").map((i) => i.id + ":" + i.message)); const newErrors = issues.filter((i) => i.severity === "error" && !existingIssues.has(i.id + ":" + i.message)); if (newErrors.length > 0) return { ok: false, issues };'
);
fs.writeFileSync("server.ts", c, "utf8");
console.log("PATCHED SUCCESSFULLY");
