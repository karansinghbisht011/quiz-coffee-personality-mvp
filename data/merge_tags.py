"""Join data/menus_master.csv with the 8 tagged chunks -> data/coffee_database.csv and data/cafe_tags.csv, and run consistency checks."""
import csv, glob, collections

VOCAB = {"strength": {"mild", "medium", "strong"}, "sweetness": {"none", "light", "sweet", "dessert"}, "milk": {"black", "milk", "plant milk"},
         "temperature": {"hot", "iced"}, "flavour": {"nutty", "chocolate", "caramel", "fruity", "spiced", "classic"},
         "adventurousness": {"familiar", "curious", "bold"}, "vibe": {"cozy", "social", "work-friendly", "aesthetic", "quick stop"},
         "setting": {"boutique", "chain", "pub or brewery"}, "crowd": {"quiet", "lively"}}
COFFEE = ["strength", "sweetness", "milk", "temperature", "flavour", "adventurousness"]; CAFE = ["vibe", "setting", "crowd"]

master = {r["sno"]: r for r in csv.DictReader(open("data/menus_master.csv"))}
tags, chunk_of = {}, {}
for f in sorted(glob.glob("data/tagging/tagged_rows_*.csv")):
    for r in csv.DictReader(open(f)):
        tags[r["sno"]] = r; chunk_of[r["sno"]] = f[-6:-4]
cafe_tags = {}
for f in sorted(glob.glob("data/tagging/tagged_cafes_*.csv")):
    for r in csv.DictReader(open(f)):
        cafe_tags[r["cafe"]] = r

print("master rows:", len(master), "| tagged rows:", len(tags), "| missing tags:", len(set(master) - set(tags)), "| extra:", len(set(tags) - set(master)))
bad = []
for sno, t in tags.items():
    for d in COFFEE:
        for v in filter(None, t[d].split("|")):
            if v not in VOCAB[d]: bad.append((sno, d, v))
        if bool(t[d]) != bool(t[d + "_basis"]): bad.append((sno, d, "basis mismatch"))
for c, t in cafe_tags.items():
    for d in CAFE:
        for v in filter(None, t[d].split("|")):
            if v not in VOCAB[d]: bad.append((c, d, v))
print("vocabulary or basis errors:", len(bad), bad[:8])

excl = [s for s, t in tags.items() if t["exclude"].strip().lower() == "yes"]
print("excluded rows:", len(excl))
keep = [s for s in master if s in tags and s not in excl]
rows = []
for sno in keep:
    m, t = master[sno], tags[sno]
    row = {"sno": sno, "cafe": m["cafe"], "maps_link": m["maps_link"], "coffee_item": m["coffee_item"], "type": m["type"], "description": m["description"], "source_url": m["source_url"]}
    for d in COFFEE: row[d] = t[d]; row[d + "_basis"] = t[d + "_basis"]
    ct = cafe_tags.get(m["cafe"], {})
    for d in CAFE: row[d] = ct.get(d, ""); row[d + "_basis"] = ct.get(d + "_basis", "")
    rows.append(row)
w = csv.DictWriter(open("data/coffee_database.csv", "w", newline=""), fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
w = csv.DictWriter(open("data/cafe_tags.csv", "w", newline=""), fieldnames=["cafe", "vibe", "vibe_basis", "setting", "setting_basis", "crowd", "crowd_basis"]); w.writeheader(); w.writerows(cafe_tags.values())
print("final database rows:", len(rows), "| cafes:", len({r['cafe'] for r in rows}))

print("\nblank % by dimension (final):", {d: round(100 * sum(1 for r in rows if not r[d]) / len(rows)) for d in COFFEE})
print("rows with 0-2 coffee dimensions filled:", sum(1 for r in rows if sum(1 for d in COFFEE if r[d]) <= 2), "| 6 of 6 filled:", sum(1 for r in rows if all(r[d] for d in COFFEE)))
print("\nvalue counts:")
for d in COFFEE: print(" ", d, dict(collections.Counter(v for r in rows for v in r[d].split("|") if v).most_common()))
print("\nsweetness 'light' / 'none' share by chunk:")
by = collections.defaultdict(lambda: collections.Counter())
for r in rows: by[chunk_of[r["sno"]]][r["sweetness"] or "(blank)"] += 1
for c in sorted(by): print(" ", c, dict(by[c]))
print("\ncafe tags:", {d: dict(collections.Counter(t[d] or "(blank)" for t in cafe_tags.values())) for d in CAFE})
print("beans/not-drink-looking rows:", sum(1 for r in rows if any(w in r["coffee_item"].lower() for w in ("beans", "single origin", "ground", "pack", "bag", "kg", "gm"))))
