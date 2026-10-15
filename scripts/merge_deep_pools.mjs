import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const poolDir = path.join(rootDir, "content", "pool");
const deepPoolPath = path.join(poolDir, "dunno_tr_pools.json");

if (!fs.existsSync(deepPoolPath)) {
  console.error("dunno_tr_pools.json not found!");
  process.exit(1);
}

const deepData = JSON.parse(fs.readFileSync(deepPoolPath, "utf8"));
const i18n = deepData.i18nPools || {};

const KEY_ORDER = ["id", "trigger", "intent", "tr", "en", "es"];

function formatPool(entries) {
  const line = (e) => {
    const keys = [...KEY_ORDER.filter((k) => k in e), ...Object.keys(e).filter((k) => !KEY_ORDER.includes(k))];
    return `  { ${keys.map((k) => `${JSON.stringify(k)}: ${JSON.stringify(e[k])}`).join(", ")} }`;
  };
  const out = [];
  entries.forEach((e, i) => {
    if (i > 0 && e.trigger !== entries[i - 1].trigger) out.push("");
    out.push(line(e) + (i < entries.length - 1 ? "," : ""));
  });
  return entries.length === 0 ? "[]\n" : `[\n${out.join("\n")}\n]\n`;
}

function cleanIdPart(trigger) {
  return trigger.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

for (const lang of ["tr", "en", "es"]) {
  const poolFile = path.join(poolDir, `pool_${lang}.json`);
  let existing = [];
  if (fs.existsSync(poolFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(poolFile, "utf8"));
    } catch (err) {
      existing = [];
    }
  }

  const existingByTrigger = new Map();
  for (const item of existing) {
    if (!existingByTrigger.has(item.trigger)) existingByTrigger.set(item.trigger, []);
    existingByTrigger.get(item.trigger).push(item);
  }

  const langPools = i18n[lang] || {};
  const merged = [...existing];

  let addedTriggers = 0;
  let addedLines = 0;

  for (const [trigger, items] of Object.entries(langPools)) {
    // Eğer mevcut havuzda bu trigger hiç yoksa ekle
    if (!existingByTrigger.has(trigger) || existingByTrigger.get(trigger).length === 0) {
      addedTriggers++;
      const baseClean = cleanIdPart(trigger);
      items.forEach((it, idx) => {
        const text = typeof it === "string" ? it : it.text;
        const tone = typeof it === "object" && it.tone ? it.tone : trigger;
        const entry = {
          id: `${lang}_${baseClean}_${String(idx + 1).padStart(2, "0")}`,
          trigger,
          intent: tone,
          [lang]: text,
        };
        merged.push(entry);
        addedLines++;
      });
    }
  }

  // Bidirectional aliases: question:* <-> answer:*
  const currentTriggers = new Map();
  merged.forEach((e) => {
    if (!currentTriggers.has(e.trigger)) currentTriggers.set(e.trigger, []);
    currentTriggers.get(e.trigger).push(e);
  });

  for (const [trig, list] of Array.from(currentTriggers.entries())) {
    let mirror = null;
    if (trig.startsWith("question:")) mirror = "answer:" + trig.slice(9);
    else if (trig.startsWith("answer:")) mirror = "question:" + trig.slice(7);
    if (mirror && (!currentTriggers.has(mirror) || currentTriggers.get(mirror).length === 0)) {
      const baseClean = cleanIdPart(mirror);
      list.forEach((orig, idx) => {
        merged.push({
          id: `${lang}_${baseClean}_${String(idx + 1).padStart(2, "0")}`,
          trigger: mirror,
          intent: orig.intent || mirror,
          [lang]: orig[lang],
        });
      });
    }
  }

  console.log(`[${lang.toUpperCase()}] Existing: ${existing.length}, Added triggers: ${addedTriggers}, Added lines: ${addedLines}, New total: ${merged.length}`);
  fs.writeFileSync(poolFile, formatPool(merged), "utf8");
}

console.log("Merge completed successfully.");
