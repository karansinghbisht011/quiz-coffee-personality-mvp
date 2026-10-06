"""Export the final database to one JSON file for the quiz app: data/quiz_data.json.
Cafes are stored once (with their tags, Maps link and popularity rank); each coffee points at its cafe."""
import csv, json, re

ck = lambda s: re.sub(r"[^a-z0-9]", "", re.sub(r"\b(cafe|coffee|the|and|co|restaurant)\b", "", (s or "").lower().replace("'", "")))
rank = {}
for r in csv.DictReader(open("data/popular_shortlist.csv")):
    if r["best_rank"].strip():
        rank.setdefault(ck(r["name"]), int(float(r["best_rank"])))
split = lambda v: [x for x in (v or "").split("|") if x]
rows = list(csv.DictReader(open("data/coffee_database.csv")))
tags = {r["cafe"]: r for r in csv.DictReader(open("data/cafe_tags.csv"))}
cafes, coffees = {}, []
for r in rows:
    c = r["cafe"]
    if c not in cafes:
        t = tags[c]
        cafes[c] = {"maps_link": r["maps_link"], "type": r["type"], "popularity_rank": rank.get(ck(c)),
                    "vibe": split(t["vibe"]), "crowd": t["crowd"] or None, "setting": t["setting"] or None}
    coffees.append({"id": int(r["sno"]), "cafe": c, "name": r["coffee_item"],
                    "strength": r["strength"] or None, "sweetness": r["sweetness"] or None, "milk": r["milk"] or None,
                    "temperature": r["temperature"] or None, "flavour": split(r["flavour"]), "adventurousness": r["adventurousness"] or None})
json.dump({"cafes": cafes, "coffees": coffees}, open("data/quiz_data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("cafes:", len(cafes), "| coffees:", len(coffees), "| cafes with a popularity rank:", sum(1 for c in cafes.values() if c["popularity_rank"] is not None),
      "| cafes with a Maps link:", sum(1 for c in cafes.values() if c["maps_link"]), "| chains (Any):", sum(1 for c in cafes.values() if c["maps_link"] == "Any"))
