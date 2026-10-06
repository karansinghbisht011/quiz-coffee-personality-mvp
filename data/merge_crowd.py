"""Merge the cafe-data fix (phase 10.1c): crowd for blank cafes, vibe for blank cafes, pub or brewery setting.
Reads:  data/tagging/crowd_pass/output_main_*.csv, output_small_*.csv  (columns: cafe, crowd, crowd_basis, vibe, vibe_basis, setting, setting_basis, evidence, evidence_url, searches_used, note)
Writes: data/cafe_tags.csv, data/cafe_evidence.csv, data/coffee_database.csv (cafe-level columns only), after a backup to data/tagging/backup_pre_crowd/
Only FILLS blanks (an existing non-blank tag is never overwritten). Coffee rows, menus, ratings and prices are untouched.
Usage: python3 data/merge_crowd.py [--dry-run]"""
import csv, glob, os, shutil, sys, collections, re
DRY = "--dry-run" in sys.argv
VOCAB = {"vibe": {"cozy", "social", "work-friendly", "aesthetic", "quick stop"}, "crowd": {"quiet", "lively"}, "setting": {"chain", "pub or brewery"}}
BASIS = {"stated", "inferred"}
URL = re.compile(r"^https?://", re.I)
FILES = ["data/cafe_tags.csv", "data/cafe_evidence.csv", "data/coffee_database.csv"]

tags = list(csv.DictReader(open(FILES[0]))); tag_cols = list(tags[0].keys())
ev = list(csv.DictReader(open(FILES[1]))); ev_cols = list(ev[0].keys())
db = list(csv.DictReader(open(FILES[2]))); db_cols = list(db[0].keys())
by_cafe = {r["cafe"]: r for r in tags}
ev_by = {r["cafe"]: r for r in ev}

errors, changes, skipped = [], collections.defaultdict(dict), collections.Counter()
new = {}
for f in sorted(glob.glob("data/tagging/crowd_pass/output_main_*.csv") + glob.glob("data/tagging/crowd_pass/output_small_*.csv")):
    for r in csv.DictReader(open(f)):
        new[r["cafe"]] = r  # later files win (re-runs)
for cafe, r in new.items():
    if cafe not in by_cafe: errors.append(f"unknown cafe: {cafe}"); continue
    t = by_cafe[cafe]
    url = (r.get("evidence_url") or "").strip()
    for dim in ("crowd", "vibe", "setting"):
        raw = (r.get(dim) or "").strip()
        if not raw: continue
        vals = [v for v in raw.split("|") if v]
        bad = [v for v in vals if v not in VOCAB[dim]]
        basis = (r.get(dim + "_basis") or "").strip()
        if bad: errors.append(f"{cafe}: {dim} has {bad}"); continue
        if dim == "crowd" and len(vals) != 1: errors.append(f"{cafe}: crowd needs exactly one value"); continue
        if dim == "setting" and (len(vals) != 1 or vals[0] == "chain"): errors.append(f"{cafe}: setting only accepts pub or brewery here"); continue
        if not all(b in BASIS for b in basis.split("|") if b) or not basis: errors.append(f"{cafe}: {dim} basis '{basis}' invalid"); continue
        if not URL.match(url): errors.append(f"{cafe}: {dim} filled without an evidence URL"); continue
        if t[dim]: skipped[f"{dim} already set"] += 1; continue  # never overwrite
        changes[cafe][dim] = ("|".join(vals), basis)

def cov(rows):
    n = len(rows)
    return {d: sum(1 for r in rows if r[d]) for d in ("vibe", "crowd", "setting")} | {"n": n, "lively": sum(1 for r in rows if r["crowd"] == "lively"), "quiet": sum(1 for r in rows if r["crowd"] == "quiet"), "pub": sum(1 for r in rows if r["setting"] == "pub or brewery")}
before = cov(tags)
for cafe, ch in changes.items():
    for dim, (val, basis) in ch.items():
        by_cafe[cafe][dim], by_cafe[cafe][dim + "_basis"] = val, basis
    e = ev_by[cafe]
    r = new[cafe]
    e["evidence"] = (e["evidence"] + " | Cafe-data pass (2026-10-06): " + (r.get("evidence") or "")).strip(" |")
    if not e["evidence_url"] and (r.get("evidence_url") or "").strip(): e["evidence_url"] = r["evidence_url"].strip()
    e["calls_used"] = str(int(e["calls_used"] or 0) + int(r.get("searches_used") or 0))
    e["routes_used"] = (e["routes_used"] + "|C") if e["routes_used"] else "C"
for row in db:
    t = by_cafe.get(row["cafe"])
    if t:
        for d in ("vibe", "setting", "crowd"): row[d], row[d + "_basis"] = t[d], t[d + "_basis"]
after = cov(tags)
print("errors:", len(errors)); [print("  ", e) for e in errors[:30]]
print("skipped:", dict(skipped))
print("cafes changed:", len(changes), "| crowd filled:", sum(1 for c in changes.values() if "crowd" in c), "| vibe filled:", sum(1 for c in changes.values() if "vibe" in c), "| pub set:", sum(1 for c in changes.values() if "setting" in c))
print("before:", before); print("after: ", after)
if errors: print("NOT WRITING: fix the errors first"); sys.exit(1)
if DRY: print("dry run: nothing written"); sys.exit(0)
bk = "data/tagging/backup_pre_crowd/"; os.makedirs(bk, exist_ok=True)
for f in FILES:
    dst = bk + os.path.basename(f)
    if not os.path.exists(dst): shutil.copy(f, dst)  # keep the first backup only
for f, rows, cols in ((FILES[0], tags, tag_cols), (FILES[1], ev, ev_cols), (FILES[2], db, db_cols)):
    with open(f, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)
print("written; backup in", bk)
