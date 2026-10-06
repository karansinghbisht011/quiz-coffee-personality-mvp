"""Derive cafe-level 'specialty' and 'experimental_menu' from the menu we already hold (no web).
Writes data/tagging/derived_cafe_facts.csv. Everything here is basis 'inferred'. Web evidence, when available, overrides it."""
import csv, re, collections

SPECIALTY_ITEM = re.compile(r"single[- ]origin|\bestate\b|pour[- ]?over|\bv60\b|aero ?press|chemex|siphon|syphon|kalita|manual brew|cupping|\bmicro[- ]?lot\b|\bnaturals?\b|honey process", re.I)
SPECIALTY_NAME = re.compile(r"roaster|roastery|roasting|coffee works|brew ?bar|specialty|speciality", re.I)
EXPERIMENTAL_ITEM = re.compile(r"tonic|infus|jaggery|cardamom|coconut|nitro|cascara|smoked|miso|yuzu|kombucha|cocktail|orange|lavender|sea salt", re.I)

rows = list(csv.DictReader(open("data/coffee_database.csv")))
by = collections.defaultdict(list)
for r in rows: by[r["cafe"]].append(r)
out = []
for cafe, items in by.items():
    text = lambda r: f"{r['coffee_item']} {r['description']}"
    sp_hits = sum(1 for r in items if SPECIALTY_ITEM.search(text(r)))
    name_sp = bool(SPECIALTY_NAME.search(cafe))
    specialty = "yes" if (name_sp or sp_hits >= 3) else "unknown"   # tuned 2026-10-06 so bold lands near 16%
    ex_hits = sum(1 for r in items if EXPERIMENTAL_ITEM.search(text(r)))
    adv = sum(1 for r in items if r["adventurousness"] in ("curious", "bold"))
    experimental = "yes" if (len(items) >= 8 and adv / len(items) >= 0.25 and ex_hits >= 4) else "unknown"
    ev = []
    if name_sp: ev.append("name says roaster/specialty")
    if sp_hits: ev.append(f"{sp_hits} items with specialty-method words")
    if experimental == "yes": ev.append(f"{ex_hits} twist items, {adv}/{len(items)} curious or bold")
    out.append(dict(cafe=cafe, specialty=specialty, experimental_menu=experimental, items=len(items), basis="inferred", evidence="; ".join(ev)))
w = csv.DictWriter(open("data/tagging/derived_cafe_facts.csv", "w", newline=""), fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
print("cafes:", len(out), "| specialty yes:", sum(1 for o in out if o["specialty"] == "yes"), "| experimental yes:", sum(1 for o in out if o["experimental_menu"] == "yes"), "| either:", sum(1 for o in out if "yes" in (o["specialty"], o["experimental_menu"])))
