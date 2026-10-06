"""Merge data/raw/editorial_*.json into data/universe.csv.
Adds columns: editorial_mentions (count of articles/lists), editorial_sources. Unmatched editorial places are appended as new rows (no coordinates)."""
import csv, json, glob, re, unicodedata, difflib
from collections import defaultdict


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(the|cafe|coffee|roasters|roastery|restaurant)\b", " ", s)   # generic words ignored for matching
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


rows = list(csv.DictReader(open("data/universe.csv")))
for r in rows:
    r.setdefault("editorial_mentions", "0"); r.setdefault("editorial_sources", "")
    r["_m"] = norm(r["name"])
by_key = defaultdict(list)
for r in rows:
    by_key[r["_m"]].append(r)

items = []
for f in sorted(glob.glob("data/raw/editorial_*.json")):
    theme = f.split("editorial_")[1].replace(".json", "")
    for e in json.load(open(f)):
        e["theme"] = theme
        items.append(e)
print("editorial entries:", len(items))

matched = new = 0
added = {}
for e in items:
    key = norm(e["name"])
    if not key:
        continue
    hits = by_key.get(key) or []
    if not hits:                                             # fuzzy fallback on same-first-token names
        cands = [k for k in by_key if k and k.split()[0:1] == key.split()[0:1]]
        close = [k for k in cands if difflib.SequenceMatcher(None, k, key).ratio() >= 0.88]
        hits = [r for k in close for r in by_key[k]]
    if hits:
        matched += 1
        for r in hits[:1] if len(hits) > 3 else hits:        # many outlets (a chain): flag them all only if <=3
            r["editorial_mentions"] = str(int(r["editorial_mentions"]) + 1)
            r["editorial_sources"] = (r["editorial_sources"] + "; " if r["editorial_sources"] else "") + e["theme"]
    else:
        new += 1
        if key in added:
            added[key]["editorial_mentions"] = str(int(added[key]["editorial_mentions"]) + 1)
            continue
        nr = {c: "" for c in rows[0] if c != "_m"}
        nr.update(name=e["name"], norm_name=re.sub(r"[^a-z0-9 ]+", " ", e["name"].lower()).strip(), address=e.get("neighbourhood") or e.get("area") or "",
                  category=e.get("kind_of_place", "cafe"), website=e.get("source_url", ""), coffee_signal="True", in_osm="False", in_overture="False",
                  franchise_candidate="False", chain_outlets="1", editorial_mentions="1", editorial_sources=e["theme"], chain_key=norm(e["name"]))
        nr["_m"] = key
        added[key] = nr
rows.extend(added.values())
for i, r in enumerate(rows, 1):
    r["uid"] = i
cols = [c for c in rows[0] if c != "_m"]
w = csv.DictWriter(open("data/universe.csv", "w", newline=""), fieldnames=cols, extrasaction="ignore")
w.writeheader(); w.writerows(rows)
print("matched existing:", matched, "| new places added:", len(added), "| total rows:", len(rows))
print("new places sample:", [r["name"] for r in list(added.values())[:25]])
