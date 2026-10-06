"""Pre-select about 20 candidates per scene from scripts/out/candidates.json with simple, explainable scoring,
download 500 px thumbnails (standard Wikimedia width) to a temp folder, and build contact sheets I can look at.
Dev-only. Usage: .venv-crawl/bin/python scripts/preselect.py <tmp_dir>"""
import json, re, subprocess, sys, os, time, urllib.parse, collections
import fitz

TMP = sys.argv[1]; os.makedirs(TMP, exist_ok=True)
UA = os.environ.get("PHOTO_UA", "BengaluruCoffeeQuizPhotoFinder/0.1 (non-commercial learning project; read-only API use)")
cands = json.load(open("scripts/out/candidates.json"))

KW = {
 "auto": r"auto|rickshaw|tuk", "traffic-police": r"police|constable|traffic", "traffic-jam": r"traffic|flyover|junction|silk board|hebbal|outer ring|congest|rush|bus",
 "weather": r"rain|monsoon|cloud|storm|mist|fog|sunset|sky|flood|waterlog", "signal": r"signal|junction|traffic light|sarjapur|crossing|intersection",
 "landmarks": r"palace|lalbagh|cubbon|cathedral|market|vidhana|metro|mural|street art|commercial street|church street|temple|museum|fort|glass house|bandstand",
 "tech-park": r"tech|park|embassy|bagmane|manyata|electronic city|itpl|campus|office|building|whitefield", "pov-cup": r"coffee|cafe|filter|tumbler|davara|restaurant|interior|dosa|tea|breakfast",
}
MON = [("palace", r"palace"), ("lalbagh", r"lalbagh|glass house"), ("cubbon", r"cubbon"), ("cathedral", r"cathedral|church"), ("market", r"market"), ("vidhana", r"vidhana"),
       ("metro", r"metro"), ("mural", r"mural|street art|graffiti"), ("commercial", r"commercial street"), ("temple", r"temple|bull"), ("museum", r"museum|fort|tipu|bandstand")]
def text(c): return " ".join([c["title"], c["description"], " ".join(c["categories"])]).lower()
def score(c, sc):
    t = text(c); s = 0
    s += 3 if c["quality"] else 0
    s += 2.5 if re.search(r"bangalore|bengaluru", t) else (1 if re.search(r"karnataka|india|mysore|chennai", t) else -1)
    s += 1.5 if re.search(KW[sc], t) else -2
    s += min(c["width"] / 4000, 1)
    return s
def monument(c):
    t = text(c)
    for name, rx in MON:
        if re.search(rx, t): return name
    return "other"

pool = {}
for sc in KW:
    cs = [c for c in cands if c["scene"] == sc]
    cs.sort(key=lambda c: -score(c, sc))
    per_author, per_group, picked, seen_titles = collections.Counter(), collections.Counter(), [], set()
    limit = 30 if sc == "landmarks" else 22
    for c in cs:
        a = re.sub(r"\W+", " ", c["author"].lower())[:30] or "?"
        base = re.sub(r"[\d_\-\.]+", "", c["title"].lower())[:24]
        g = monument(c) if sc == "landmarks" else base
        if per_author[a] >= 3 or per_group[g] >= (2 if sc == "landmarks" else 2) or base in seen_titles and sc != "landmarks": continue
        per_author[a] += 1; per_group[g] += 1; seen_titles.add(base); picked.append(c)
        if len(picked) >= limit: break
    pool[sc] = picked
json.dump(pool, open(TMP + "/preselected.json", "w"), indent=1, ensure_ascii=False)
print({k: len(v) for k, v in pool.items()})

def fetch(c):
    path = f"{TMP}/{abs(hash(c['id'])) % 10**10}.jpg"
    if not os.path.exists(path) or os.path.getsize(path) < 2000:
        url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(c["title"].replace(" ", "_")) + "?width=500"
        subprocess.run(["curl", "-4", "-sL", "--max-time", "40", "-A", UA, "-o", path, url])
        time.sleep(0.8)
    return path if os.path.exists(path) and os.path.getsize(path) > 2000 else None

for sc, items in pool.items():
    for i in range(0, len(items), 12):
        chunk = items[i:i + 12]
        doc = fitz.open(); page = doc.new_page(width=1500, height=1130)
        for k, c in enumerate(chunk):
            r, col = divmod(k, 4)
            x, y = 12 + col * 372, 12 + r * 372
            p = fetch(c)
            box = fitz.Rect(x, y, x + 360, y + 270)
            if p:
                try: page.insert_image(box, filename=p, keep_proportion=True)
                except Exception as e: page.insert_text((x + 5, y + 20), "image error", fontsize=11)
            label = f"#{i + k + 1} {c['title'][:44]}"
            page.insert_text((x + 2, y + 288), label, fontsize=11)
            page.insert_text((x + 2, y + 303), f"{c['licence']} | {c['author'][:30]} | {c['width']}px", fontsize=9.5)
            page.insert_text((x + 2, y + 317), ("Q " if c["quality"] else "") + c["description"][:62].replace("\n", " "), fontsize=9)
        page.get_pixmap(dpi=72).save(f"{TMP}/sheet-{sc}-{i // 12 + 1}.png")
    print(sc, "sheets:", (len(items) + 11) // 12, flush=True)
