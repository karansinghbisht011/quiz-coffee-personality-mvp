"""Find candidate scene photos on Wikimedia Commons (and optionally Openverse) for the quiz's result page.
Dev-only discovery (REQUIREMENTS section 7). It only READS public APIs, filters by licence, size and shape,
and writes scripts/out/candidates.json for a human to review. No image is downloaded into the repo.
Usage: python3 scripts/find_photos.py [scene ...]        (default: all scenes)
Uses curl over IPv4 (this network's IPv6 route is dead for some hosts) and a descriptive User-Agent."""
import json, re, subprocess, sys, time, html, urllib.parse, os

UA = os.environ.get("PHOTO_UA", "BengaluruCoffeeQuizPhotoFinder/0.1 (non-commercial learning project; read-only API use)")
OUT = "scripts/out/candidates.json"

SCENES = {
    "auto": ["Bangalore autorickshaw", "Bengaluru auto rickshaw", "auto rickshaw Bangalore street", "autorickshaw Bangalore night", "auto rickshaw driver Bangalore", "autorickshaw Karnataka", "auto rickshaws Bangalore rain", "Bangalore auto stand"],
    "traffic-police": ["Bangalore traffic police", "Bengaluru traffic policeman", "traffic police Bangalore junction", "traffic policeman rain Bangalore", "Bangalore traffic constable", "traffic police India", "Indian traffic policeman", "traffic policeman Karnataka", "traffic police Mysore", "traffic police Chennai", "policeman directing traffic India"],
    "traffic-jam": ["Bangalore traffic jam", "Silk Board junction", "Outer Ring Road Bangalore traffic", "Bengaluru traffic congestion", "Hebbal flyover traffic", "Bangalore rush hour", "Bangalore road traffic", "Bangalore flyover", "traffic Karnataka India road", "India traffic congestion two wheelers", "Bangalore peak hour traffic", "Bangalore bus traffic", "Bangalore night traffic lights trails"],
    "weather": ["Bangalore rain", "Bengaluru monsoon", "Bangalore dark clouds", "Cubbon Park mist", "Bangalore waterlogging rain street", "Bangalore sunset clouds"],
    "signal": ["Sarjapur Road Bangalore", "Bangalore traffic signal junction", "Bengaluru traffic light", "Silk Board signal", "Marathahalli junction Bangalore", "Bellandur Sarjapur road traffic", "Bangalore junction", "Bangalore road crossing", "Bangalore intersection night", "Koramangala junction", "Indiranagar 100 feet road"],
    "landmarks": ["Bangalore Palace", "Lalbagh glass house", "Cubbon Park Bangalore", "St. Mark's Cathedral Bangalore", "KR Market Bangalore flower", "Vidhana Soudha", "Namma Metro Bangalore", "Bangalore street art mural", "Commercial Street Bangalore", "Church Street Bangalore", "Bull Temple Bangalore"],
    "tech-park": ["Manyata Tech Park", "Embassy Tech Village Bangalore", "Bagmane tech park", "Electronic City Bangalore", "Bangalore IT park", "Whitefield ITPL Bangalore"],
    "pov-cup": ["cafe Bangalore interior", "filter coffee Bangalore", "Bangalore coffee shop", "filter coffee tumbler davara", "Indian Coffee House Bangalore", "Bangalore cafe window", "coffee cup Bangalore street", "South Indian filter coffee", "coffee shop India interior", "cafe India window", "Karnataka filter coffee", "Coorg coffee", "Chikmagalur coffee", "Bangalore restaurant breakfast dosa coffee", "Bangalore cafe table"],
}

def curl_json(url, tries=3):
    for t in range(tries):
        p = subprocess.run(["curl", "-4", "-s", "--max-time", "40", "-A", UA, url], capture_output=True, text=True)
        if p.returncode == 0 and p.stdout.strip().startswith(("{", "[")):
            try: return json.loads(p.stdout)
            except json.JSONDecodeError: pass
        time.sleep(4 * (t + 1))
    return None

TAG = re.compile(r"<[^>]+>")
clean = lambda s: html.unescape(TAG.sub("", s or "")).strip()

# licence normalisation: only CC0, public domain, CC BY, CC BY-SA
def licence(short, url):
    s = (short or "").strip()
    u = (url or "").lower()
    if re.search(r"\b(nc|nd)\b", s, re.I) or "-nc" in u or "-nd" in u: return None
    if re.fullmatch(r"CC0.*|CC Zero.*", s, re.I): return "CC0"
    if re.search(r"public domain|\bPD\b|PDM", s, re.I): return "PDM"
    m = re.fullmatch(r"CC BY-SA ([0-9.]+)", s, re.I)
    if m: return f"CC BY-SA {m.group(1)}"
    m = re.fullmatch(r"CC BY ([0-9.]+)", s, re.I)
    if m: return f"CC BY {m.group(1)}"
    return None

BAD_WORDS = re.compile(r"logo|flag|map of|coat of arms|poster|advert|screenshot|diagram|stamp|banner|icon|symbol|portrait of|\.svg", re.I)

def commons(query, limit=40):
    p = {"action": "query", "format": "json", "generator": "search", "gsrnamespace": 6, "gsrlimit": limit,
         "gsrsearch": f"{query} filetype:bitmap", "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata",
         "iiurlwidth": 640, "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Categories|DateTimeOriginal|ObjectName"}
    d = curl_json("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(p))
    out = []
    for pg in ((d or {}).get("query", {}).get("pages", {}) or {}).values():
        ii = (pg.get("imageinfo") or [None])[0]
        if not ii: continue
        m = {k: v.get("value", "") for k, v in (ii.get("extmetadata") or {}).items()}
        lic = licence(m.get("LicenseShortName"), m.get("LicenseUrl"))
        w, h = ii.get("width", 0), ii.get("height", 0)
        title = pg["title"].removeprefix("File:")
        if not lic or ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"): continue
        if w < 1600 or w < 1.3 * h or BAD_WORDS.search(title): continue
        cats = [c for c in m.get("Categories", "").split("|") if c]
        out.append(dict(id="commons:" + title, provider="commons", title=title, author=clean(m.get("Artist")), licence=lic,
                        licence_url=m.get("LicenseUrl", ""), source_url=ii.get("descriptionurl", ""), image_url=ii.get("url", ""),
                        thumb_url=ii.get("thumburl", ""), width=w, height=h, description=clean(m.get("ImageDescription"))[:300],
                        categories=cats[:10], quality=any(re.search(r"quality images|featured pictures", c, re.I) for c in cats),
                        date=clean(m.get("DateTimeOriginal"))[:30]))
    return out

def main():
    scenes = sys.argv[1:] or list(SCENES)
    found = {}
    if os.path.exists(OUT): found = {c["id"] + "|" + c["scene"]: c for c in json.load(open(OUT))}
    for sc in scenes:
        n0 = len([1 for c in found.values() if c["scene"] == sc])
        for q in SCENES[sc]:
            for c in commons(q):
                key = c["id"] + "|" + sc
                if key not in found: found[key] = dict(c, scene=sc, query=q)
            time.sleep(1.2)
        n1 = len([1 for c in found.values() if c["scene"] == sc])
        print(f"{sc}: {n1 - n0} new candidates ({n1} total)", flush=True)
    json.dump(list(found.values()), open(OUT, "w"), indent=1, ensure_ascii=False)
    print("written", OUT, len(found))

if __name__ == "__main__": main()
