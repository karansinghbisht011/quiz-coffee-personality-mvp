"""Harvest restaurant page URLs from Zomato and Swiggy listing pages (slow, resumable).
Writes data/raw/harvest_urls.jsonl (one line per URL: site, url, listing, rating_hint) and crawl/harvest_log.txt."""
import asyncio, socket, re, json, os, sys, time

_o = socket.getaddrinfo
socket.getaddrinfo = lambda *a, **k: [r for r in _o(*a, **k) if r[0] == socket.AF_INET] or _o(*a, **k)
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

OUT, LOG = "data/raw/harvest_urls.jsonl", "crawl/harvest_log.txt"
AREAS = """indiranagar koramangala hsr-layout jayanagar jp-nagar btm-layout whitefield marathahalli electronic-city bellandur sarjapur-road
malleshwaram rajajinagar basavanagudi banashankari yelahanka hebbal hennur kalyan-nagar hrbr-layout banaswadi church-street mg-road brigade-road
lavelle-road richmond-road residency-road cunningham-road frazer-town ulsoor domlur old-airport-road cv-raman-nagar kr-puram yeshwantpur vijayanagar
rr-nagar kengeri bannerghatta-road uttarahalli kanakapura-road jakkur sahakara-nagar rt-nagar sadashivanagar seshadripuram shivajinagar
commercial-street infantry-road langford-town shanti-nagar wilson-garden koramangala-5th-block koramangala-4th-block koramangala-6th-block
koramangala-7th-block koramangala-8th-block brookefield kadugodi varthur mahadevapura bommanahalli hosur-road devanahalli doddaballapur
tumkur-road nagawara thanisandra rajarajeshwari-nagar nandini-layout peenya magadi-road mysore-road jp-nagar-phase-1 ejipura sanjay-nagar
hosur nelamangala hoskote anekal ramanagara tumakuru""".split()
CUISINES = json.load(open("data/raw/zomato_listing_pages.json"))["cuisines"]

listings = []
for c in CUISINES:
    listings.append(("zomato", f"https://www.zomato.com/bangalore/restaurants/{c}"))
for a in AREAS:
    listings.append(("zomato", f"https://www.zomato.com/bangalore/{a}-restaurants"))
for a in AREAS[:30]:
    listings.append(("zomato", f"https://www.zomato.com/bangalore/{a}-restaurants/cafes"))
listings.append(("swiggy", "https://www.swiggy.com/city/bangalore/best-restaurants"))
for a in AREAS[:25]:
    listings.append(("swiggy", f"https://www.swiggy.com/city/bangalore/best-restaurants-in-{a}"))

if os.environ.get("EXTRA"):
    names = "hsr btm hbr-layout vijay-nagar sadashiv-nagar rajarajeshwari-nagar".split()
    listings = [("zomato", f"https://www.zomato.com/bangalore/{n}-restaurants") for n in names]
    listings += [("zomato", f"https://www.zomato.com/bangalore/{n}-restaurants/cafes") for n in names]
    listings += [("zomato", f"https://www.zomato.com/bangalore/restaurants/{c}") for c in ("microbrewery", "tea", "south-indian")]
    listings += [("zomato", "https://www.zomato.com/tumkur/restaurants")]

done = set()
if os.path.exists(LOG):
    done = {l.split("\t")[0] for l in open(LOG)}
seen = set()
if os.path.exists(OUT):
    seen = {json.loads(l)["url"] for l in open(OUT)}

Z = re.compile(r"https://www\.zomato\.com/bangalore/([a-z0-9\-]+)/info")
S = re.compile(r"https://www\.swiggy\.com/restaurants/[a-z0-9\-]+-\d+/dineout")


async def main():
    async with AsyncWebCrawler(config=BrowserConfig(headless=True, chrome_channel="chrome", channel="chrome", verbose=False)) as c:
        cfg = CrawlerRunConfig(page_timeout=90000, verbose=False, wait_until="domcontentloaded", delay_before_return_html=2, scan_full_page=True, scroll_delay=0.6)
        for site, url in listings:
            if url in done:
                continue
            try:
                r = await c.arun(url=url, config=cfg)
                md = str(r.markdown or "")
                cards = []   # (rank, url, card_text, promoted) in page order
                if site == "zomato":
                    seen_here = set()
                    for m in re.finditer(r"(\[Promoted )?[^\n]*?\[([^\]\n]{0,400})\]\((https://www\.zomato\.com/(?:bangalore|tumkur)/([a-z0-9\-]+)/info)[^)]*\)", md):
                        slug = m.group(4)
                        if slug in seen_here or not m.group(2).strip():
                            continue
                        seen_here.add(slug)
                        cards.append((len(cards) + 1, m.group(3), m.group(2).strip(), bool(m.group(1))))
                else:
                    hrefs = []
                    for g in (r.links or {}).values():
                        for l in g:
                            if S.fullmatch(l["href"]) and l["href"] not in [h for h, _ in hrefs]:
                                hrefs.append((l["href"], (l.get("text") or "").strip()))
                    cards = [(i + 1, h, t, False) for i, (h, t) in enumerate(hrefs)]
                new = 0
                with open(OUT, "a") as f:
                    for rank, u, text, promo in cards:
                        f.write(json.dumps({"site": site, "url": u, "listing": url, "rank": rank, "promoted": promo, "card": text}) + "\n")
                        new += u not in seen; seen.add(u)
                line = f"{url}\t{r.status_code}\tfound={len(cards)}\tnew={new}\ttotal={len(seen)}"
            except Exception as e:
                line = f"{url}\tERROR\t{str(e)[:80]}"
            open(LOG, "a").write(line + "\n")
            await asyncio.sleep(3)

asyncio.run(main())
