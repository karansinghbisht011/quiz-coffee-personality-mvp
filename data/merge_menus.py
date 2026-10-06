"""Merge all menu files into data/menus_master.csv and print a tally from the files themselves.
If one cafe appears in several source files (shortlist duplicates), keep the single file with the most rows for it and list the conflict."""
import csv, glob, re
from collections import Counter, defaultdict

COLS = ["cafe", "maps_link", "coffee_item", "type", "price", "description", "menu_section", "source_url", "notes"]
ckey = lambda s: re.sub(r"\b(cafe|coffee|the|and|co|restaurant)\b", "", re.sub(r"[^a-z0-9 ]+", "", (s or "").lower().replace("'", ""))).strip().replace(" ", "")
files = ["data/chain_menus.csv", "data/menus/menu_chains_remaining.csv"] + sorted(glob.glob("data/menus/menu_batch_*.csv")) + sorted(glob.glob("data/menus/menu_pass2_*.csv"))

by_cafe = defaultdict(lambda: defaultdict(list))        # cafe key -> file -> rows
for f in files:
    for r in csv.DictReader(open(f)):
        r = {c: (r.get(c) or "").strip() for c in COLS}
        if r["cafe"] and r["coffee_item"]:
            by_cafe[ckey(r["cafe"])][f.split("/")[-1]].append(r)

merged, conflicts = [], []
for k, per_file in by_cafe.items():
    if len(per_file) > 1:
        best = max(per_file, key=lambda f: (len(per_file[f]), sum(1 for r in per_file[f] if r["price"])))
        conflicts.append((k, {f: len(v) for f, v in per_file.items()}, best))
        rows = per_file[best]
    else:
        rows = next(iter(per_file.values()))
    seen = set()
    for r in rows:                                        # drop exact duplicates inside the cafe
        sig = (re.sub(r"\W+", "", r["coffee_item"].lower()), r["price"])
        if sig not in seen:
            seen.add(sig); merged.append(r)
for i, r in enumerate(merged, 1):
    r["sno"] = i
OUT_COLS = [c for c in COLS if c != "price"]   # price dropped from the final database (user decision, 2026-10-06)
w = csv.DictWriter(open("data/menus_master.csv", "w", newline=""), fieldnames=["sno"] + OUT_COLS, extrasaction="ignore"); w.writeheader(); w.writerows(merged)

cafes = {r["cafe"] for r in merged}
print("master rows:", len(merged), "| cafes/chains:", len(cafes), "| standalone:", len({r['cafe'] for r in merged if r['type'] == 'standalone'}), "| franchise:", len({r['cafe'] for r in merged if r['type'] == 'franchise'}))
print("blank price:", sum(1 for r in merged if not r["price"]), "| blank description:", sum(1 for r in merged if not r["description"]))
print("cafes in more than one source file:", len(conflicts))
for k, per, best in conflicts:
    print("  ", k, per, "-> kept", best)

# final status per shortlist cafe: best of all status lines
rank = {"done": 0, "no_coffee": 1, "ambiguous_name": 2, "closed": 3, "no_menu_found": 4}
final = {}
for f in sorted(glob.glob("data/menus/status_*.csv")):
    for r in csv.DictReader(open(f)):
        k = ckey(r["cafe"]); s = r["status"].strip()
        if k not in final or rank.get(s, 9) < rank.get(final[k], 9):
            final[k] = s
have = {ckey(c) for c in cafes}
for k in have:
    final[k] = "done"
print("final status by distinct cafe:", dict(Counter(final.values())), "| distinct cafes:", len(final))
