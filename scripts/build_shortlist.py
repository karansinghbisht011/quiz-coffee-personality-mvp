"""Build the shortlist outputs from my review of the contact sheets (phase 10.3):
  web/data/scene-photos.json   the photo references the app uses (links, not files)
  design/image-credits.md      the credit list (generated from the JSON)
  design/photo-shortlist.html  the contact sheet the user reviews (thumbnails load from Wikimedia)
Selections are (scene, sheet number) pairs from scripts/out/preselected.json, chosen by eye on 2026-10-06.
Usage: python3 scripts/build_shortlist.py <preselected.json>"""
import json, re, sys, html, urllib.parse

pre = json.load(open(sys.argv[1]))
# (scene it is shown in, scene sheet it was found on, sheet numbers). Numbers are 1-based positions in preselected[scene].
PICKS = [
    ("auto", "auto", [5, 10, 11, 13, 17, 4, 1, 15]),
    ("traffic-police", "traffic-police", [5, 11, 12, 13, 15, 17, 1]),
    ("traffic-jam", "traffic-jam", [1, 17, 16, 5, 7, 3, 4]),
    ("weather", "weather", [1, 2, 4, 6, 7, 9, 10, 11, 14, 3]),
    ("signal", "signal", [9, 11, 13]),
    ("signal", "traffic-jam", [14, 10, 21]),       # Silk Board junction, a busy junction, a rainy signal in Dharwad
    ("landmarks", "landmarks", [2, 3, 5, 6, 9, 12, 14, 16, 17, 20]),
    ("tech-park", "tech-park", [1, 2, 3, 6, 8, 15, 17, 20, 22, 5]),
    ("pov-cup", "pov-cup", [10, 12, 11, 2, 3, 22, 15, 14]),
]
PLACES = [(r"bangalore|bengaluru", "Bengaluru"), (r"mysuru|mysore", "Mysuru"), (r"coorg|kodagu", "Coorg, Karnataka"), (r"dharwad", "Dharwad, Karnataka"),
          (r"kolkata|calcutta", "Kolkata"), (r"goa", "Goa"), (r"chennai", "Chennai"), (r"karnataka", "Karnataka")]
def place(c):
    """The place named by the photo's own source text, and where it was found: title, description or category."""
    for src, text in (("title", c["title"]), ("description", c["description"]), ("category", " ".join(c["categories"]))):
        for rx, name in PLACES:
            if re.search(rx, text.lower()): return name, src
    return "", ""
LICENCE_URL = {"CC0": "https://creativecommons.org/publicdomain/zero/1.0/", "PDM": "https://creativecommons.org/publicdomain/mark/1.0/"}
def alt(c):
    d = re.sub(r"\s+", " ", c["description"]).strip()
    if 12 <= len(d) <= 160 and not d.lower().startswith(("q ", "english", "this media")): return d.rstrip(".") + "."
    t = re.sub(r"\.(jpe?g|png|webp)$", "", c["title"], flags=re.I)
    t = re.sub(r"\(\d{6,}\)", "", t).replace("_", " ")
    return re.sub(r"\s+", " ", t).strip() + "."

out, seen = [], set()
for scene, sheet, nums in PICKS:
    for n in nums:
        c = pre[sheet][n - 1]
        if (scene, c["id"]) in seen: continue
        seen.add((scene, c["id"]))
        out.append(dict(id=c["id"].replace("commons:", "commons-").replace(" ", "_"), scene=scene, provider="commons", title=c["title"], file=c["title"].replace(" ", "_"),
                        alt=alt(c), place=place(c)[0], place_source=place(c)[1], author=re.sub(r"\s+", " ", c["author"]).strip(), licence=c["licence"], licence_url=c["licence_url"] or LICENCE_URL.get(c["licence"], ""),
                        source_url=c["source_url"], image_url=c["image_url"], width=c["width"], height=c["height"], quality=bool(c["quality"]), approved=True))
json.dump(out, open("web/data/scene-photos.json", "w"), indent=1, ensure_ascii=False)

# credits
L = ["# Image credits", "", "Scene photos on the result page are linked from Wikimedia Commons and shown under their Creative Commons or public-domain licences. They are not stored in this repository. Generated from `web/data/scene-photos.json` by `scripts/build_shortlist.py`.", ""]
for sc in dict.fromkeys(p["scene"] for p in out):
    L += [f"## {sc}", "", "| Photo | Author | Licence | Place (from the source text) |", "|---|---|---|---|"]
    for p in [x for x in out if x["scene"] == sc]:
        L.append(f"| [{p['title']}]({p['source_url']}) | {p['author'] or 'unknown'} | [{p['licence']}]({p['licence_url']}) | {p['place'] or 'not stated'} |")
    L.append("")
open("design/image-credits.md", "w").write("\n".join(L))

# contact sheet for the user
def thumb(p): return "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(p["file"]) + "?width=330"
cards = {}
for p in out:
    badge = ("bn", "Bengaluru") if p["place"] == "Bengaluru" else (("ot", p["place"]) if p["place"] else ("un", "place not stated"))
    cards.setdefault(p["scene"], []).append(f"""<label class="card"><input type="checkbox" data-id="{html.escape(p['id'])}" checked>
<img loading="lazy" src="{thumb(p)}" alt="{html.escape(p['alt'])}">
<div class="meta"><b>{html.escape(re.sub(r'[_]', ' ', p['title'])[:70])}</b>
<span class="badge {badge[0]}">{html.escape(badge[1])}</span> <span class="lic">{html.escape(p['licence'])}</span>{' <span class="q">quality image</span>' if p['quality'] else ''}
<div class="by">{html.escape((p['author'] or 'unknown')[:60])} &middot; {p['width']} px &middot; <a href="{html.escape(p['source_url'])}" target="_blank" rel="noopener">source</a></div>
<div class="alt">{html.escape(p['alt'][:150])}</div></div></label>""")
SC = {"auto": "Autorickshaw", "traffic-police": "Traffic police", "traffic-jam": "Traffic jam", "weather": "Weather and clouds", "signal": "Signal and junctions", "landmarks": "Landmarks and street life", "tech-park": "Tech park", "pov-cup": "Window-seat view with a cup (our drawn hand and tumbler go in front)"}
body = "".join(f'<section><h2>{SC[s]} <small>{len(v)} photos</small></h2><div class="grid">{"".join(v)}</div></section>' for s, v in cards.items())
page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Photo shortlist</title>
<style>body{{font:15px/1.4 system-ui,sans-serif;margin:0;background:#f6f0e6;color:#25231f}}header{{position:sticky;top:0;background:#fffaf2;border-bottom:1px solid #d9cdbd;padding:12px 20px;z-index:2}}
h1{{font-size:20px;margin:0 0 4px}}p{{margin:2px 0}}main{{padding:8px 20px 60px;max-width:1300px;margin:auto}}h2{{margin:28px 0 10px}}h2 small{{font-weight:400;color:#655b51}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px}}.card{{display:block;background:#fff;border:2px solid #d9cdbd;border-radius:14px;overflow:hidden;cursor:pointer}}
.card:has(input:checked){{border-color:#4f6648}}.card:has(input:not(:checked)){{opacity:.45;border-style:dashed}}.card input{{position:absolute;margin:10px;width:20px;height:20px}}
.card img{{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#e8ded0}}.meta{{padding:10px 12px}}.by,.alt{{color:#655b51;font-size:13px;margin-top:4px}}.alt{{font-style:italic}}
.badge{{font-size:12px;border-radius:99px;padding:2px 8px;margin-left:4px}}.bn{{background:#dfe7d5;color:#2f4a28}}.ot{{background:#fde7c4;color:#7a4a00}}.un{{background:#e8e4de;color:#555}}
.lic{{font-size:12px;border:1px solid #bbb;border-radius:99px;padding:1px 7px}}.q{{font-size:12px;color:#6f4a8e}}button{{font:inherit;padding:8px 14px;border-radius:10px;border:1px solid #6b452d;background:#6b452d;color:#fff;cursor:pointer;margin-top:6px}}
#out{{width:100%;height:70px;margin-top:6px;font:12px monospace}}</style></head><body>
<header><h1>Bengaluru scene photos: please review ({len(out)} photos)</h1>
<p>Tick the photos you want in the quiz; untick any you dislike (unticked ones fade). Orange badges are photos from another place: they will be captioned with that real place, never as Bengaluru.</p>
<p>Photos load from Wikimedia Commons and carry their licence and author. Nothing is stored in the project.</p>
<button onclick="go()">Copy my choices</button> <span id="n"></span><textarea id="out" readonly placeholder="Your choices appear here: paste them back to Claude"></textarea></header>
<main>{body}</main>
<script>function go(){{const all=[...document.querySelectorAll('input[data-id]')];const no=all.filter(x=>!x.checked).map(x=>x.dataset.id);
const t=no.length?('Remove these '+no.length+' photos:\\n'+no.join('\\n')):'Keep all '+all.length+' photos';document.getElementById('out').value=t;navigator.clipboard&&navigator.clipboard.writeText(t).catch(()=>{{}});document.getElementById('n').textContent=(all.length-no.length)+' kept, '+no.length+' removed (copied)';}}</script></body></html>"""
open("design/photo-shortlist.html", "w").write(page)
import collections
print(len(out), "photos;", dict(collections.Counter(p["scene"] for p in out)))
print("places:", dict(collections.Counter(p["place"] or "not stated" for p in out)))
print("authors >2 per scene:", [(s, a, n) for (s, a), n in collections.Counter((p["scene"], p["author"]) for p in out).items() if n > 2])
