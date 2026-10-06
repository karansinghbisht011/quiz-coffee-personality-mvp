"""Build data/popular_shortlist.csv from the harvest + universe.
Rule (REQUIREMENTS.md section 3): rating >= 4.0, a cafe/coffee/tea/bakery/beverage or brewery tag, ranked by best non-promoted page position.
Franchises (same name in 3+ harvested places) collapse to one row."""
import csv, json, re, unicodedata
from collections import defaultdict

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", s)).strip()

STOP = {"the", "cafe", "coffee", "restaurant", "bar", "kitchen", "and", "co", "roasters", "house"}
key = lambda s: " ".join(t for t in norm(s).split() if t not in STOP) or norm(s)

CARD = re.compile(r"^(?P<name>.+?)\s+(?P<rating>\d\.\d|New)\s+_star-fill_\s*(?P<rest>.*)$")
COFFEE_LISTING = re.compile(r"/cafes|restaurants/(coffee|tea|bakery|bakeries|microbrewery|beverage|irani)", re.I)
SWIGGY = re.compile(r"^(?P<name>.+?)(?P<rating>\d\.\d)(?P<cuis>[^₹]*?)₹(?P<price>[\d,]+) for two(?P<area>.*?),\s*(?:Bangalore|Bengaluru)")
places = {}                       # url -> aggregate
for line in open("data/raw/harvest_urls.jsonl"):
    r = json.loads(line)
    card = r["card"].replace("\n", " ")
    m = CARD.match(card)
    if not m and r["site"] == "swiggy":
        sm = SWIGGY.match(re.sub(r"^GIRF SPECIAL", "", card))
        m = {"name": sm["name"], "rating": sm["rating"], "rest": f'{sm["cuis"]} ₹{sm["price"]} for two {sm["area"]}, Bangalore'} if sm else None
    if not m:
        continue
    p = places.setdefault(r["url"], dict(site=r["site"], url=r["url"], name=m["name"].strip(), rating=m["rating"], rest=m["rest"], ranks=[], coffee_ranks=[], listings=set(), promoted_only=True))
    p["listings"].add(r["listing"])
    if not r["promoted"]:
        p["ranks"].append(r["rank"]); p["promoted_only"] = False
        if COFFEE_LISTING.search(r["listing"]):
            p["coffee_ranks"].append(r["rank"])

def parse_rest(rest):
    price = re.search(r"₹\s*([\d,]+)\s*for two", rest)
    cuis = rest.split("₹")[0].strip().rstrip(",")
    area = ""
    if price:
        after = rest[price.end():].strip()
        area = re.split(r",\s*(?:Bangalore|Bengaluru|Tumkur)|\sOpens|\sClosed|\d+(\.\d+)?\s*(km|m)\b", after)[0].strip(" ,")
    return cuis, (price.group(1).replace(",", "") if price else ""), area

rows = []
for p in places.values():
    if p["rating"] == "New":
        continue
    cuis, price, area = parse_rest(p["rest"].replace("•", ","))
    c = cuis.lower()
    tag = "brewery" if ("microbrewery" in c or "brew" in p["name"].lower()) else "cafe_or_coffee" if re.search(r"cafe|coffee|irani|filter|\btea\b", c) else ""
    if float(p["rating"]) < 4.0 or not tag:
        continue
    rows.append(dict(name=p["name"], area=area, rating=float(p["rating"]), cuisines=cuis, price_for_two=price, tag=tag,
                     best_rank=min(p["coffee_ranks"]) if p["coffee_ranks"] else "", any_rank=min(p["ranks"]) if p["ranks"] else "", appearances=len(p["listings"]), promoted_only=p["promoted_only"],
                     site=p["site"], source_url=p["url"], k=key(p["name"])))

# franchises: same key in 3+ places
groups = defaultdict(list)
for r in rows:
    groups[r["k"]].append(r)
out = []
for k, g in groups.items():
    if len(g) >= 3:
        best = min(g, key=lambda r: (r["best_rank"] == "", r["best_rank"] if r["best_rank"] != "" else 0))
        out.append({**best, "area": f"{len(g)} outlets", "type": "franchise", "appearances": sum(r["appearances"] for r in g), "rating": round(sum(r["rating"] for r in g) / len(g), 1)})
    else:
        out += [{**r, "type": "standalone"} for r in g]

# match to the universe
uni = list(csv.DictReader(open("data/universe.csv")))
idx = defaultdict(list)
for u in uni:
    idx[key(u["name"])].append(u)
for r in out:
    cands = idx.get(r["k"], [])
    area_t = set(norm(r["area"]).split()) - {"outlets"}
    pick = None
    if r["type"] == "franchise":
        pick = cands[0] if cands else None
    else:
        scored = sorted(cands, key=lambda u: -len(area_t & set(norm(u["address"]).split())))
        pick = scored[0] if scored and (len(cands) == 1 or area_t & set(norm(scored[0]["address"]).split())) else None
    r.update(universe_uid=pick["uid"] if pick else "", lat=pick["lat"] if pick else "", lon=pick["lon"] if pick else "",
             website=pick["website"] if pick else "", match="matched" if pick else "unmatched")

out.sort(key=lambda r: (r["promoted_only"], r["best_rank"] == "", r["best_rank"] if r["best_rank"] != "" else 0, -r["appearances"], -r["rating"]))
cols = ["name", "type", "area", "rating", "cuisines", "price_for_two", "tag", "best_rank", "any_rank", "appearances", "promoted_only", "site", "source_url", "universe_uid", "lat", "lon", "website", "match"]
w = csv.DictWriter(open("data/popular_shortlist.csv", "w", newline=""), fieldnames=cols, extrasaction="ignore")
w.writeheader(); w.writerows(out)

from collections import Counter
print("cards not parsed:", sum(1 for _ in open("data/raw/harvest_urls.jsonl")) and len({json.loads(l)["url"] for l in open("data/raw/harvest_urls.jsonl")} - set(places)))
print("harvested unique:", len(places), "| passing the cut:", len(out))
print("by type:", Counter(r["type"] for r in out), "| by tag:", Counter(r["tag"] for r in out))
print("matched to universe:", Counter(r["match"] for r in out), "| promoted-only:", sum(r["promoted_only"] for r in out))
print("top 20:", [(r["name"], r["area"], r["rating"]) for r in out[:20]])
print("franchises:", [(r["name"], r["area"]) for r in out if r["type"] == "franchise"][:25])
