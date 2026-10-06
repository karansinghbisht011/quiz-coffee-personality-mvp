"""Derive cafe-level tags from LOCAL text only (no network): cafe name, Zomato cuisines, OSM/Overture category,
coffee items and descriptions, and any raw menu text on disk (crawl/raw). Everything is basis 'inferred'.
Calibrates each rule against web-backed tags and writes data/tagging/menu_signals.csv + calibration printed."""
import csv, glob, os, re, collections

ck = lambda s: re.sub(r"[^a-z0-9]", "", re.sub(r"\b(cafe|coffee|the|and|co|restaurant)\b", "", (s or "").lower().replace("'", "")))
db = list(csv.DictReader(open("data/coffee_database.csv")))
by = collections.defaultdict(list)
for r in db: by[r["cafe"]].append(r)
sl = {ck(r["name"]): r for r in csv.DictReader(open("data/popular_shortlist.csv"))}
uni = {}
for r in csv.DictReader(open("data/universe.csv")): uni.setdefault(ck(r["name"]), r)

raw = collections.defaultdict(str)                      # cafe key -> raw menu text on disk
for d in (os.listdir("crawl/raw/menus") if os.path.isdir("crawl/raw/menus") else []):   # crawl/raw was deleted on 2026-10-06
    for f in glob.glob(f"crawl/raw/menus/{d}/*"):
        if f.lower().endswith((".md", ".txt", ".html")):
            raw[ck(d.replace("-", " "))] += " " + open(f, errors="ignore").read()[:200000]
for f in glob.glob("crawl/raw/chains/*.md"):
    raw[ck(os.path.basename(f)[:-3].replace("-", " "))] += " " + open(f, errors="ignore").read()[:200000]

ALC = re.compile(r"\b(beer|lager|ipa|stout|whisk(?:e)?y|vodka|rum|gin|tequila|wine|cocktail|pitcher|tower|brew(?:ery|ed)? on tap|shots?)\b", re.I)
HOOKAH = re.compile(r"hookah|shisha", re.I)
BAKE = re.compile(r"cake|brownie|croissant|pastr|cookie|muffin|tart\b|donut|waffle|bake", re.I)
TEA = re.compile(r"\btea\b|chai|matcha|kombucha", re.I)
BREW = re.compile(r"pour[- ]?over|\bv60\b|aero ?press|chemex|manual brew|single[- ]origin|\bestate\b|siphon", re.I)

def web_tags():
    w = {}
    for f in glob.glob("data/tagging/vibe/cafe_vibe_*.csv"):
        for r in csv.DictReader(open(f)):
            if r["vibe"] or r["crowd"]:
                w[ck(r["cafe"])] = r
    return w

out, W = [], web_tags()
for cafe, items in by.items():
    k = ck(cafe); name = cafe.lower()
    cu = {c.strip().lower() for c in (sl.get(k, {}).get("cuisines", "")).replace("|", ",").split(",") if c.strip()}
    cat = (uni.get(k, {}).get("overture_category") or uni.get(k, {}).get("category") or "").lower()
    txt = " ".join(f"{r['coffee_item']} {r['description']}" for r in items) + " " + raw.get(k, "")
    alc = len(ALC.findall(txt)); hk = bool(HOOKAH.search(txt)) or "hookah" in cu
    pub = bool(cu & {"bar", "pub", "microbrewery", "brewery", "beer", "bar food"}) or cat in {"brewery", "pub", "bar", "gastropub", "beer_bar", "brewpub", "cocktail_bar"} \
          or bool(re.search(r"\b(brewery|brewing co|taproom|brewhouse|pub)\b", name))
    bake = len(BAKE.findall(txt)); tea = len(TEA.findall(txt)); brew = len(BREW.findall(txt))
    f = dict(cafe=cafe, setting="", vibe="", crowd="", why="")
    if pub and not re.search(r"coffee|cafe", name): f["setting"] = "pub or brewery"; f["why"] += "pub_cues;"
    cues = []
    if pub or hk or "lounge" in name or "lounge" in cu: cues.append("social")
    if (cu & {"bakery", "desserts", "dessert", "tea", "sandwich"}) and re.search(r"home|house|garden|kitchen|cottage|book|bake|patiss|nest|mane|ajji|story|stories", name): cues.append("cozy")
    if re.search(r"\bart\b|studio|gallery|curated|atelier|design|matcha|patisserie|roastery|souk", name) or (cu & {"matcha"}): cues.append("aesthetic")
    if (cu & {"fast food"}) and (cu & {"beverages"}) and not (cu & {"continental", "italian", "european"}) or re.search(r"express|kiosk|takeaway|on the go|stall|cart", name): cues.append("quick stop")
    if re.search(r"cowork|co-work|work cafe|study|workspace", name): cues.append("work-friendly")
    f["vibe"] = "|".join(dict.fromkeys(cues)) if len(cues) >= 1 and (len(cues) >= 2 or cues[0] in {"social", "quick stop"}) else ""
    if pub or hk or alc >= 6: f["crowd"] = "lively"; f["why"] += "bar_or_hookah_cues;"
    f.update(alc=alc, bake=bake, tea=tea, brew=brew, had_raw=bool(raw.get(k)), cuisines=len(cu))
    out.append(f)
w = csv.DictWriter(open("data/tagging/menu_signals.csv", "w", newline=""), fieldnames=list(out[0])); w.writeheader(); w.writerows(out)

print("cafes:", len(out), "| with raw menu text on disk:", sum(1 for o in out if o["had_raw"]), "| proposed: setting", sum(1 for o in out if o["setting"]), "| vibe", sum(1 for o in out if o["vibe"]), "| crowd", sum(1 for o in out if o["crowd"]))
print("\nCalibration against web-backed tags (agree = web tag contains the same value):")
def cal(label, getter, webget):
    pos = [o for o in out if getter(o) and ck(o["cafe"]) in W and webget(W[ck(o["cafe"])]) != ""]
    agree = [o for o in pos if getter(o) in webget(W[ck(o["cafe"])]) or all(v in webget(W[ck(o["cafe"])]) for v in getter(o).split("|"))]
    print(f"  {label:34} proposed on web-covered cafes: {len(pos):3}  agree: {len(agree):3}  ({round(100*len(agree)/max(len(pos),1))}%)")
for v in ("social", "cozy", "aesthetic", "quick stop"):
    cal(f"vibe contains {v}", lambda o, v=v: v if v in o["vibe"].split("|") else "", lambda r: r["vibe"])
cal("crowd = lively", lambda o: o["crowd"], lambda r: r["crowd"])
print("  (web 'crowd' is mostly blank, so lively can only be checked where web gave a crowd value)")
