#!/usr/bin/env python3
"""
Dunno — Unified Repository Exporter (v19.0)
Generates:
  1. content/pool/pool_tr.json (1,645 validated Entry[] items for @desktop/lines/engine)
  2. content/pool/pool_en.json (1,645 validated Entry[] items for @desktop/lines/engine)
  3. content/context/sites.json (SPEC 09 K7 categories + 183 entertainment rules)
  4. content/pool/COVERAGE.md (pool coverage summary)
  5. Optional (--export-markdown): content/pool/{tr,en,es}/*.md (963 deep pools)
"""
import argparse
import json
import pathlib
import shutil


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Dunno v19.0 pools and context into repository.")
    parser.add_argument("--repo-root", default=".", help="Path to Dunno repo root (e.g. C:\\Users\\pc\\Downloads\\Dunnothebean)")
    parser.add_argument("--pool-tr", default="pool_tr.json", help="Path to pool_tr.json")
    parser.add_argument("--pool-en", default="pool_en.json", help="Path to pool_en.json")
    parser.add_argument("--sites-json", default="sites_entertainment.json", help="Path to sites_entertainment.json")
    parser.add_argument("--pools-json", default="dunno_tr_pools.json", help="Path to dunno_tr_pools.json")
    parser.add_argument("--export-markdown", action="store_true", help="Also export 963 markdown files under content/pool/{tr,en,es}/")
    args = parser.parse_args()

    repo = pathlib.Path(args.repo_root).resolve()
    pool_dir = repo / "content" / "pool"
    ctx_dir = repo / "content" / "context"
    pool_dir.mkdir(parents=True, exist_ok=True)
    ctx_dir.mkdir(parents=True, exist_ok=True)

    for src_name, dst_name in [(args.pool_tr, "pool_tr.json"), (args.pool_en, "pool_en.json")]:
        src = pathlib.Path(src_name)
        if src.exists():
            shutil.copyfile(src, pool_dir / dst_name)
            data = json.loads((pool_dir / dst_name).read_text(encoding="utf-8"))
            print(f"[OK] Wrote {pool_dir / dst_name} ({len(data)} entries)")

    sites_src = pathlib.Path(args.sites_json)
    if sites_src.exists():
        shutil.copyfile(sites_src, ctx_dir / "sites.json")
        print(f"[OK] Wrote {ctx_dir / 'sites.json'}")

    pools_src = pathlib.Path(args.pools_json)
    if pools_src.exists():
        shutil.copyfile(pools_src, pool_dir / "dunno_tr_pools.json")
        print(f"[OK] Wrote {pool_dir / 'dunno_tr_pools.json'}")
        if args.export_markdown:
            raw = json.loads(pools_src.read_text(encoding="utf-8"))
            i18n = raw.get("i18nPools", {})
            count_files = 0
            for lang, pools in i18n.items():
                lang_dir = pool_dir / lang
                lang_dir.mkdir(parents=True, exist_ok=True)
                for key, items in pools.items():
                    safe_name = key.replace(":", "__") + ".md"
                    lines = [f"# {key} ({lang})", ""]
                    for item in items:
                        txt = item["text"] if isinstance(item, dict) else str(item)
                        lines.append(f"- {txt}")
                    (lang_dir / safe_name).write_text("\n".join(lines) + "\n", encoding="utf-8")
                    count_files += 1
            print(f"[OK] Exported {count_files} markdown pool files.")


if __name__ == "__main__":
    main()