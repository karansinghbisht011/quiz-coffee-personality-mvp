"""Merge web vibe research + menu-derived facts into the final database, apply the Bold rule, fix known data errors, validate.
Reads: data/tagging/vibe/cafe_vibe_*.csv (+ 04b/12b re-runs), data/tagging/derived_cafe_facts.csv, data/tagging/menu_signals.csv, data/coffee_database_pre_vibe.csv
Writes: data/coffee_database.csv, data/cafe_tags.csv, data/cafe_evidence.csv"""
import csv, glob, re, collections

VOCAB = {"vibe": {"cozy", "social", "work-friendly", "aesthetic", "quick stop"}, "crowd": {"quiet", "lively"}, "setting": {"chain", "pub or brewery"},
         "strength": {"mild", "medium", "strong"}, "sweetness": {"none", "light", "sweet", "dessert"}, "milk": {"black", "milk", "plant milk"}, "temperature": {"hot", "iced"},
         "flavour": {"nutty", "chocolate", "caramel", "fruity", "spiced", "classic"}, "adventurousness": {"familiar", "curious", "bold"}}
rows = list(csv.DictReader(open("data/coffee_database_pre_vibe.csv")))
cafes = sorted({r["cafe"] for r in rows})

# 1. web results (re-run files replace a cafe's row when they have content)
web = {}
for f in sorted(glob.glob("data/tagging/vibe/cafe_vibe_[0-9][0-9].csv")):
    for r in csv.DictReader(open(f)): web[r["cafe"]] = r
for f in sorted(glob.glob("data/tagging/vibe/cafe_vibe_*b.csv")):
    for r in csv.DictReader(open(f)):
        if r["vibe"] or r["crowd"] or r["specialty"] == "yes" or r["experimental_menu"] == "yes" or r["cafe"] not in web: web[r["cafe"]] = r
# generic-search gap fill: only fills fields that are still empty; 'yes' facts always count
for f in sorted(glob.glob("data/tagging/vibe/cafe_vibe_gap_*.csv")):
    for g in csv.DictReader(open(f)):
        w0 = web.get(g["cafe"])
        if not w0: web[g["cafe"]] = g; continue
        for k, kb in (("vibe", "vibe_basis"), ("crowd", "crowd_basis")):
            if not w0.get(k) and g.get(k): w0[k], w0[kb] = g[k], g[kb]
        for k in ("specialty", "experimental_menu"):
            if g.get(k) == "yes": w0[k] = "yes"
        for k in ("about", "evidence", "evidence_url"):
            if not w0.get(k) and g.get(k): w0[k] = g[k]
derived = {r["cafe"]: r for r in csv.DictReader(open("data/tagging/derived_cafe_facts.csv"))}
sig = {r["cafe"]: r for r in csv.DictReader(open("data/tagging/menu_signals.csv"))}
old_cafe = {}
for r in rows: old_cafe.setdefault(r["cafe"], r)

def clean(vals, dim):
    out = [v.strip() for v in (vals or "").split("|") if v.strip() in VOCAB[dim]]
    return list(dict.fromkeys(out))

cafe_out, notes = {}, collections.Counter()
for c in cafes:
    w, d, s, o = web.get(c, {}), derived.get(c, {}), sig.get(c, {}), old_cafe[c]
    vibe, vb = clean(w.get("vibe"), "vibe"), w.get("vibe_basis", "")
    crowd, cb = clean(w.get("crowd"), "crowd")[:1], w.get("crowd_basis", "")
    if not vibe and "social" in (s.get("vibe") or "").split("|"):                       # menu signal: social only (71% agreement)
        vibe, vb = ["social"], "inferred"; notes["vibe from menu signal (social)"] += 1
    setting, sb = o["setting"], o["setting_basis"]
    if setting == "boutique": setting, sb = "", ""                                      # dropped 2026-10-06 (no information)
    if s.get("setting") == "pub or brewery" and setting != "chain": setting, sb = "pub or brewery", "inferred"; notes["setting pub or brewery from menu"] += 1
    spec = "yes" if w.get("specialty") == "yes" else ("yes" if d.get("specialty") == "yes" and w.get("specialty") in ("", "unknown", None) else (w.get("specialty") or "unknown"))
    exp = "yes" if w.get("experimental_menu") == "yes" else ("yes" if d.get("experimental_menu") == "yes" and w.get("experimental_menu") in ("", "unknown", None) else (w.get("experimental_menu") or "unknown"))
    cafe_out[c] = dict(cafe=c, vibe="|".join(vibe), vibe_basis=vb if vibe else "", setting=setting, setting_basis=sb, crowd="|".join(crowd), crowd_basis=cb if crowd else "",
                       specialty=spec, experimental_menu=exp)
# known multi-outlet brands wrongly labelled standalone (flagged by the vibe agents)
for name in ("Adhira & Appa Coffee", "Brew Bakes Cafe", "Magnolia Bakery"):
    for c in cafe_out:
        if c.lower().startswith(name.lower()[:12]): cafe_out[c]["setting"], cafe_out[c]["setting_basis"] = "chain", "inferred"; notes["setting set to chain (multi-outlet)"] += 1

# 2. rebuild rows: cafe tags, fixes, Bold rule
INFUSION = re.compile(r"tonic|infus|juice|coconut|jaggery|cascara|smoked|miso|yuzu|kombucha|lavender", re.I)
before_bold = sum(1 for r in rows if r["adventurousness"] == "bold")
final, dropped = [], 0
for r in rows:
    if r["cafe"].startswith("Cafe Muziris") and "Hand Brew Signature" in r["coffee_item"]: dropped += 1; continue      # a menu heading, not a drink
    if r["sno"] in ("2087", "2351", "2470"): r["description"] = ""; notes["wrong scraped description blanked"] += 1
    if r["cafe"].startswith("Roastea") and "medium roast" in r["description"].lower() and not r["strength"]: r["strength"], r["strength_basis"] = "medium", "stated"; notes["Roastea strength fixed"] += 1
    c = cafe_out[r["cafe"]]
    for d in ("vibe", "setting", "crowd"): r[d], r[d + "_basis"] = c[d], c[d + "_basis"]
    r["cafe_specialty"], r["cafe_experimental"] = c["specialty"], c["experimental_menu"]
    if r["adventurousness"] != "bold" and (c["specialty"] == "yes" or c["experimental_menu"] == "yes"):
        fl = set(r["flavour"].split("|")); twisty = bool(fl & {"spiced", "fruity", "nutty"}) or bool(INFUSION.search(f"{r['coffee_item']} {r['description']}"))
        if (c["specialty"] == "yes" or c["experimental_menu"] == "yes") and twisty:   # tuned 2026-10-06: plain strong drinks no longer qualify, keeps bold near 14%
            r["adventurousness"], r["adventurousness_basis"] = "bold", "inferred"; notes["coffees made bold"] += 1
    final.append(r)
cols = list(final[0]); w_ = csv.DictWriter(open("data/coffee_database.csv", "w", newline=""), fieldnames=cols); w_.writeheader(); w_.writerows(final)
ct_cols = ["cafe", "vibe", "vibe_basis", "setting", "setting_basis", "crowd", "crowd_basis", "specialty", "experimental_menu"]
w2 = csv.DictWriter(open("data/cafe_tags.csv", "w", newline=""), fieldnames=ct_cols); w2.writeheader(); w2.writerows(cafe_out.values())
ev_cols = ["cafe", "about", "google_rating", "google_review_count", "evidence", "evidence_url", "routes_used", "calls_used"]
w3 = csv.DictWriter(open("data/cafe_evidence.csv", "w", newline=""), fieldnames=ev_cols, extrasaction="ignore"); w3.writeheader()
w3.writerows([web[c] for c in cafes if c in web])

# 3. validation and report
errs = [(r["sno"], d, v) for r in final for d in VOCAB for v in filter(None, r[d].split("|")) if v not in VOCAB[d]]
bm = [(r["sno"], d) for r in final for d in list(VOCAB) if bool(r[d]) != bool(r[d + "_basis"])]
print("rows:", len(final), "(dropped", dropped, ") | cafes:", len(cafes), "| vocabulary errors:", len(errs), errs[:3], "| basis mismatches:", len(bm), bm[:3])
n = len(cafes); cnt = lambda k: sum(1 for c in cafe_out.values() if c[k])
print(f"cafe coverage: vibe {cnt('vibe')}/{n} ({round(100*cnt('vibe')/n)}%) | crowd {cnt('crowd')}/{n} | setting {cnt('setting')}/{n} | specialty yes {sum(1 for c in cafe_out.values() if c['specialty']=='yes')} | experimental yes {sum(1 for c in cafe_out.values() if c['experimental_menu']=='yes')}")
print("vibe values:", dict(collections.Counter(v for c in cafe_out.values() for v in c["vibe"].split("|") if v)))
print("setting:", dict(collections.Counter(c["setting"] or "(blank)" for c in cafe_out.values())), "| crowd:", dict(collections.Counter(c["crowd"] or "(blank)" for c in cafe_out.values())))
print(f"bold: {before_bold} -> {sum(1 for r in final if r['adventurousness']=='bold')} of {len(final)} ({round(100*sum(1 for r in final if r['adventurousness']=='bold')/len(final))}%)")
print("changes:", dict(notes))
print("cafes with no vibe:", [c for c in cafes if not cafe_out[c]["vibe"]][:40])
