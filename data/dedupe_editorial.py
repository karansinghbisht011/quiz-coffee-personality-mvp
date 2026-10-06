"""Merge editorial-only rows in data/universe.csv into an existing place when the name clearly refers to the same place.
Usage: python3 data/dedupe_editorial.py [--apply]. Dry run by default; prints each proposed merge."""
import csv, re, sys, unicodedata
from collections import defaultdict

GENERIC = {"the", "cafe", "coffee", "roasters", "roastery", "restaurant", "kitchen", "bar", "pub", "house", "and", "co", "bistro", "bakery", "brew", "brewery", "brewhouse", "lounge", "garden"}


def toks(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return [t for t in re.sub(r"[^a-z0-9 ]+", " ", s).split() if t not in GENERIC and len(t) > 1]


rows = list(csv.DictReader(open("data/universe.csv")))
T = lambda v: v == "True"
editorial_only = [r for r in rows if not T(r["in_osm"]) and not T(r["in_overture"]) and r["editorial_sources"]]
existing = [r for r in rows if r not in editorial_only]
by_first = defaultdict(list)
for r in existing:
    t = toks(r["name"])
    if t:
        by_first[t[0]].append((set(t), r))

merges, drop = [], set()
for e in editorial_only:
    te = toks(e["name"])
    if not te:
        continue
    cands = []
    for ts, r in by_first.get(te[0], []):
        s = set(te)
        if s == ts or (len(te[0]) >= 5 and (s <= ts or ts <= s)):
            cands.append(r)
    chains = {r["chain_key"] for r in cands}
    if cands and len(chains) == 1 and len(te[0]) >= 4:            # unambiguous: one place or one chain
        merges.append((e, cands[0], len(cands)))
        drop.add(e["uid"])
for e, r, n in merges:
    print(f"{e['name']!r}  ->  {r['name']!r}  ({n} match{'es' if n > 1 else ''}, {r['address'][:30]})")
print(f"\n{len(merges)} of {len(editorial_only)} editorial-only rows would merge")
if "--apply" in sys.argv:
    for e, r, n in merges:
        for x in ([r] if n == 1 else [c for c in existing if c["chain_key"] == r["chain_key"]][:1]):
            x["editorial_mentions"] = str(int(x["editorial_mentions"] or 0) + int(e["editorial_mentions"] or 1))
            x["editorial_sources"] = (x["editorial_sources"] + "; " if x["editorial_sources"] else "") + e["editorial_sources"]
    keep = [r for r in rows if r["uid"] not in drop]
    w = csv.DictWriter(open("data/universe.csv", "w", newline=""), fieldnames=list(rows[0]))
    w.writeheader(); w.writerows(keep)
    print("applied; rows:", len(keep))
