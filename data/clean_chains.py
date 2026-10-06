"""Collapse chain-name variants in data/universe.csv and recompute franchise flags + outlet counts.
Adds columns: chain_key, chain_outlets, franchise_candidate (rewritten)."""
import csv, re, unicodedata
from collections import Counter

rows = list(csv.DictReader(open("data/universe.csv")))


GENERIC = {"", "cafe", "food", "udupi", "bengaluru", "bangalore", "hotel", "bakery", "sweets", "coffee", "tea", "juice", "mess",
           "canteen", "bar", "pub", "kitchen", "bhavan", "darshini", "restaurant", "snacks", "fast food", "chat", "chaat", "dhaba",
           "meals", "sri", "shree", "new", "royal", "classic", "ice cream", "biryani", "south indian", "tiffins", "tiffin", "mane"}


def ascii_(s):
    return unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()


def base_key(r):
    raw = ascii_(r["brand"] or r["name"])
    raw = re.split(r"\s[-–|@]\s|,|\(", raw)[0]          # drop "- Indiranagar", ", Koramangala", "(Branch)"
    k = r["norm_name"] if not r["brand"] else re.sub(r"[^a-z0-9 ]+", " ", raw.lower())
    if not r["brand"]:
        k = re.sub(r"[^a-z0-9 ]+", " ", raw.lower())
    k = re.sub(r"\b(the|restaurant|restaurants|outlet|express|cafe and bistro)\b", " ", k)
    return re.sub(r"\s+", " ", k).strip()


for r in rows:
    r["chain_key"] = base_key(r)
counts = Counter(r["chain_key"] for r in rows)

# Merge keys where a frequent key is a whole-word prefix of another (domino s -> domino s pizza)
brand_keys = {re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", ascii_(r["brand"]).lower())).strip() for r in rows if r["brand"]}
frequent = sorted([k for k, v in counts.items() if v >= 3 and len(k) >= 4 and k in brand_keys and k not in GENERIC], key=len)
def canon(k):
    for f in frequent:
        if k == f or k.startswith(f + " "):
            return f
    return k
for r in rows:
    r["chain_key"] = canon(r["chain_key"])
counts = Counter(r["chain_key"] for r in rows)
for r in rows:
    n = counts[r["chain_key"]]
    r["chain_outlets"] = n
    r["franchise_candidate"] = n >= 3 and r["chain_key"] not in GENERIC

cols = list(rows[0])
w = csv.DictWriter(open("data/universe.csv", "w", newline=""), fieldnames=cols)
w.writeheader(); w.writerows(rows)
chains = [(k, v) for k, v in counts.most_common() if v >= 3 and k not in GENERIC]
print("chains (3+ outlets):", len(chains), "| places in chains:", sum(v for _, v in chains))
print(chains[:45])
