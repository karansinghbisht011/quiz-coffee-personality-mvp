"""Merge OSM + Overture raw pulls into data/universe.csv: filter to 100 km, dedupe, flag franchise candidates."""
import csv, json, math, re, unicodedata, difflib
from collections import defaultdict, Counter

LAT0, LON0, R_KM = 12.9716, 77.5946, 100.0


def hav(lat1, lon1, lat2, lon2):
    p = math.pi / 180
    a = math.sin((lat2 - lat1) * p / 2) ** 2 + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lon2 - lon1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s.encode("ascii", "ignore").decode())
    return re.sub(r"\s+", " ", s).strip()


COFFEE_WORDS = ("cafe", "coffee", "tea", "bakery", "roaster", "brew")
recs = []

# OSM
for e in json.load(open("data/raw/osm_raw.json"))["elements"]:
    t = e.get("tags", {})
    name = t.get("name")
    lat = e.get("lat") or (e.get("center") or {}).get("lat")
    lon = e.get("lon") or (e.get("center") or {}).get("lon")
    if not name or lat is None:
        continue
    cat = t.get("amenity") or t.get("shop") or t.get("craft") or ""
    recs.append(dict(src="osm", sid=f'{e["type"]}/{e["id"]}', name=name, lat=lat, lon=lon, category=cat,
                     brand=t.get("brand", ""), website=t.get("website") or t.get("contact:website") or "",
                     cuisine=t.get("cuisine", ""), address=t.get("addr:full") or " ".join(filter(None, [t.get("addr:housenumber"), t.get("addr:street"), t.get("addr:suburb")])),
                     conf=""))

# Overture
for r in csv.DictReader(open("data/raw/overture_raw.csv")):
    if not r["name"] or not r["lat"]:
        continue
    recs.append(dict(src="overture", sid=r["id"], name=r["name"], lat=float(r["lat"]), lon=float(r["lon"]),
                     category=r["category"] or r["basic_category"], brand=r["brand"], website=r["website"], cuisine="",
                     address=r["address"] or r["locality"], conf=r["confidence"]))

recs = [r for r in recs if hav(LAT0, LON0, float(r["lat"]), float(r["lon"])) <= R_KM]
print("records within 100 km:", Counter(r["src"] for r in recs))

# Dedupe: same area (<=100 m) and similar name
grid = defaultdict(list)
clusters = []
cell = lambda lat, lon: (round(lat / 0.001), round(lon / 0.001))


def similar(a, b):
    if not a or not b:
        return False
    if a == b or (min(len(a), len(b)) >= 5 and (a in b or b in a)):
        return True
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.85


for r in sorted(recs, key=lambda x: x["src"] != "osm"):  # OSM first (has brand tags)
    r["n"] = norm(r["name"])
    cx, cy = cell(r["lat"], r["lon"])
    hit = None
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for c in grid[(cx + dx, cy + dy)]:
                if hav(r["lat"], r["lon"], c["lat"], c["lon"]) * 1000 <= 100 and similar(r["n"], c["n"]):
                    hit = c
                    break
            if hit: break
        if hit: break
    if hit:
        hit["srcs"].add(r["src"]); hit[r["src"] + "_id"] = r["sid"]
        for k in ("brand", "website", "address", "cuisine"):
            if not hit[k] and r[k]:
                hit[k] = r[k]
        if r["src"] == "overture":
            hit["conf"] = r["conf"]; hit["overture_category"] = r["category"]
    else:
        c = dict(r); c["srcs"] = {r["src"]}; c[r["src"] + "_id"] = r["sid"]
        c["overture_category"] = r["category"] if r["src"] == "overture" else ""
        clusters.append(c); grid[(cx, cy)].append(c)

# Franchise candidates: same brand (or same normalised name) in 3+ places
key = lambda c: norm(c["brand"]) or c["n"]
counts = Counter(key(c) for c in clusters)
rows = []
for i, c in enumerate(sorted(clusters, key=lambda c: c["n"]), 1):
    k = key(c)
    coffee = any(w in (c["category"] + " " + c["overture_category"] + " " + c["cuisine"] + " " + c["n"]).lower() for w in COFFEE_WORDS)
    rows.append(dict(uid=i, name=c["name"], norm_name=c["n"], category=c["category"], overture_category=c["overture_category"],
                     lat=round(c["lat"], 6), lon=round(c["lon"], 6), brand=c["brand"], website=c["website"], address=c["address"],
                     coffee_signal=coffee, in_osm="osm" in c["srcs"], in_overture="overture" in c["srcs"],
                     franchise_candidate=counts[k] >= 3, outlets=counts[k] if counts[k] >= 3 else 1,
                     osm_id=c.get("osm_id", ""), overture_id=c.get("overture_id", ""), overture_confidence=c["conf"]))
w = csv.DictWriter(open("data/universe.csv", "w", newline=""), fieldnames=list(rows[0]))
w.writeheader(); w.writerows(rows)

print("unique places:", len(rows))
print("in both sources:", sum(r["in_osm"] and r["in_overture"] for r in rows), "| osm only:", sum(r["in_osm"] and not r["in_overture"] for r in rows), "| overture only:", sum(r["in_overture"] and not r["in_osm"] for r in rows))
print("coffee_signal:", sum(r["coffee_signal"] for r in rows), "| franchise candidates (places):", sum(r["franchise_candidate"] for r in rows))
print("top chains:", Counter({k: v for k, v in counts.items() if v >= 3}).most_common(15))
