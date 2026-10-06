"""Rebuild data/tagging/review_sample.md: 30 random rows + 10 rows from cafes that gained a vibe + 10 rows newly made bold."""
import csv, random
old = {r["sno"]: r for r in csv.DictReader(open("data/coffee_database_pre_vibe.csv"))}
new = list(csv.DictReader(open("data/coffee_database.csv")))
newb = [r for r in new if r["adventurousness"] == "bold" and old[r["sno"]]["adventurousness"] != "bold"]
newvibe = [r for r in new if r["vibe"] and not old[r["sno"]]["vibe"]]
random.seed(7)
tag = lambda r, d: (r[d] or "-") + ("*" if r.get(d + "_basis") == "inferred" else "")
D = ["strength", "sweetness", "milk", "temperature", "flavour", "adventurousness"]
picks = [("random", random.sample(new, 30)), ("cafe newly given a vibe", random.sample(newvibe, 10)), ("coffee newly made bold", random.sample(newb, 10))]
with open("data/tagging/review_sample.md", "w") as f:
    f.write("# Tag review sample (50 rows)\n\n`*` = inferred, `-` = blank. Tell me which rows look wrong.\n\n")
    f.write("| # | Why picked | Cafe | Drink | Menu text | strength | sweetness | milk | temp | flavour | adventurous | cafe vibe | cafe crowd | setting |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|---|\n")
    i = 0
    for label, group in picks:
        for r in group:
            i += 1
            f.write(f"| {i} | {label} | {r['cafe']} | {r['coffee_item']} | {r['description'][:60].replace('|', '/')} | " + " | ".join(tag(r, d) for d in D) + f" | {tag(r, 'vibe')} | {tag(r, 'crowd')} | {tag(r, 'setting')} |\n")
print("sample rows:", i, "| newly vibe-tagged cafes' rows:", len(newvibe), "| newly bold rows:", len(newb))
