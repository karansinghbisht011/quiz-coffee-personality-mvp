#!/usr/bin/env python3
"""Extract COFFEE items from a crawled menu page saved as markdown.

Usage: python3 extract_menu.py MENU.md [-o OUT.csv]
CSV columns: coffee_item, price, description, menu_section (stdout if no -o).
Summary (rows, sections used, skipped items with reason) goes to stderr.
Standard library only, no network. Rules: REQUIREMENTS.md sections 2, 3, 3a.

Layouts handled:
  A) heading, then a price line, then description lines   (dyu-menu.md)
        * ### Espresso
        140/-
        Classic coffee brewed in moka pot.
  B) single line: "Name - 240", "Name .... Rs. 240 - description",
     "Name | 240 | description" (table row), with or without bullets.
Prices: 240/-, Rs. 240, Rs 240, INR 240, 240, 240/280 (kept as listed).
"""
import argparse
import csv
import re
import sys

# ---- vocabulary -----------------------------------------------------------
STRONG = (r"coffee|coffees|kappi|kaapi|espresso|expresso|americano|cappuccino|capuccino|"
          r"mocha|macchiato|cortado|flat white|affogato|doppio|dopio|ristretto|lungo|"
          r"cold brew|pour.?over|aeropress|french press|moka|v60|frappe|freddo|"
          r"decoction|cafe au lait|cafe miel|melange|irish coffee")
WEAK = r"latte"  # coffee unless the name says matcha, turmeric, chai ...
STRONG_RE = re.compile(r"\b(?:%s)\b" % STRONG, re.I)
WEAK_RE = re.compile(r"\b(?:%s)\b" % WEAK, re.I)
# Words in an item NAME that mark it non-coffee (unless a STRONG word is also there)
EXCLUDE_RE = re.compile(
    r"\b(?:tea|teas|chai|matcha|juice|milkshake|shake|smoothie|chocolate|cocoa|horlicks|"
    r"bournvita|boost|turmeric|haldi|lemon|lime|limeade|soda|water|milk|chamomile|"
    r"cooler|lassi|mojito|beer|ale|lager|wine|cocktail|mocktail|kombucha)\b", re.I)

# Section heading classes
LENIENT_SEC = re.compile(r"\b(?:coffees?|espresso|kappi|kaapi)\b", re.I)       # keep all but excluded
DRINK_SEC = re.compile(r"\b(?:brews?|hot|cold|drinks?|beverages?|sips?|cafe|bar)\b", re.I)  # filter by item
IGNORE_SUBHEAD = re.compile(r"^(?:veg|non[- ]?veg|vegan|add[- ]?ons?)$", re.I)

CUR = r"(?:₹|Rs\.?|INR)"
NUM = r"\d{2,4}(?:\s*/\s*\d{2,4})*"
PRICE_ONLY = re.compile(r"^%s?\s*(?P<p>%s)\s*(?:/-|-|/)?\s*$" % (CUR, NUM), re.I)
# "Name - 240", "Name ... ₹240", "Name 240/-", optional "- description" after
INLINE = re.compile(
    r"^(?P<name>[^|\d₹][^|₹]*?)\s*(?:[-–—:.]{1,}|\s)\s*%s?\s*(?P<p>%s)\s*(?:/-|-|/)?\s*(?:[-–—:|]\s*(?P<d>.+))?$"
    % (CUR, NUM), re.I)
TABLE = re.compile(r"^\|?\s*(?P<name>[^|]+?)\s*\|\s*%s?\s*(?P<p>%s)\s*(?:/-)?\s*(?:\|\s*(?P<d>[^|]*?))?\s*\|?\s*$"
                   % (CUR, NUM), re.I)


def norm_price(p):
    return re.sub(r"\s*", "", p)


def clean(text):
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)  # md links -> text
    text = text.replace("**", "").replace("__", "")
    return re.sub(r"\s+", " ", text).strip(" \t*_-–—:.")


def classify(section, name, desc):
    """Return (keep, reason)."""
    lenient = bool(LENIENT_SEC.search(section))
    drink = lenient or bool(DRINK_SEC.search(section))
    if not drink:
        return False, "section '%s' is not a coffee/drinks section" % section
    if STRONG_RE.search(name):
        return True, ""
    if EXCLUDE_RE.search(name):
        return False, "non-coffee drink by name (%s)" % EXCLUDE_RE.search(name).group(0).lower()
    if WEAK_RE.search(name) or STRONG_RE.search(desc):
        return True, ""
    if lenient:
        return True, ""
    return False, "no coffee word in name or description"


def parse(lines):
    """Yield dicts: name, price, desc, section (every priced/heading item, any section)."""
    items, section, cur = [], "", None
    n = len(lines)

    def finish():
        nonlocal cur
        if cur:
            cur["desc"] = clean(" ".join(cur["desc"]))
            items.append(cur)
        cur = None

    def next_nonblank(i):
        j = i + 1
        while j < n and not lines[j].strip():
            j += 1
        return lines[j].strip() if j < n else ""

    for i, raw in enumerate(lines):
        indent = len(raw) - len(raw.lstrip(" "))
        s = raw.strip()
        if not s:
            finish()
            continue
        bullet = re.match(r"^[*+-]\s+", s)
        body = s[bullet.end():] if bullet else s
        head = re.match(r"^(#{1,6})\s+(.*)$", body)
        if indent >= 4 and bullet:          # variant / add-on sub-bullet
            finish()
            continue
        if head:
            title = clean(head.group(2))
            nxt = next_nonblank(i)
            if bullet or PRICE_ONLY.match(nxt.replace("**", "")):
                finish()                    # layout A item heading
                cur = {"name": title, "price": "", "desc": [], "section": section, "pending": True}
            else:
                finish()
                if title and not IGNORE_SUBHEAD.match(title):
                    section = title
            continue
        if cur and cur.get("pending"):      # first line after item heading
            m = PRICE_ONLY.match(s.replace("**", ""))
            cur["pending"] = False
            if m:
                cur["price"] = norm_price(m.group("p"))
                continue
        if s.startswith("[") or s.startswith("!["):
            finish()
            continue
        plain = s.replace("**", "") if not re.match(r"^\*\*[^*]+\*\*$", s) else s
        t = re.match(r"^\|?\s*[-: |]+\|?$", plain)
        if t:
            continue
        m = TABLE.match(body.replace("**", "")) or INLINE.match(body.replace("**", ""))
        if m:
            finish()  # single-line item; following unbroken lines may add a description
            cur = {"name": clean(m.group("name")), "price": norm_price(m.group("p")),
                   "desc": [clean(m.group("d") or "")], "section": section}
            continue
        plain_s = clean(body)
        if cur is not None and not bullet:  # description continuation (no blank line gap)
            cur["desc"].append(plain_s)
            continue
        # unbulleted bold / ALL-CAPS line = section heading
        if not bullet and (re.match(r"^\*\*[^*]+\*\*:?$", s) or
                           (plain_s.isupper() and len(plain_s) < 40 and not re.search(r"\d", plain_s))):
            finish()
            if plain_s and not IGNORE_SUBHEAD.match(plain_s):
                section = plain_s
            continue
        finish()
    finish()
    return items


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("menu_md")
    ap.add_argument("-o", "--out", help="output CSV path (default stdout)")
    a = ap.parse_args()
    with open(a.menu_md, encoding="utf-8") as f:
        lines = f.read().splitlines()

    items = parse(lines)
    rows, used, skipped = [], [], []
    for it in items:
        keep, why = classify(it["section"], it["name"], it["desc"])
        if keep:
            rows.append([it["name"], it["price"], it["desc"], it["section"]])
            if it["section"] not in used:
                used.append(it["section"])
        else:
            skipped.append((it["section"], it["name"], why))

    out = open(a.out, "w", newline="", encoding="utf-8") if a.out else sys.stdout
    w = csv.writer(out)
    w.writerow(["coffee_item", "price", "description", "menu_section"])
    w.writerows(rows)
    if a.out:
        out.close()

    err = sys.stderr
    print("Rows found: %d" % len(rows), file=err)
    print("Sections used: %s" % (", ".join(used) or "none"), file=err)
    drink_skips = [s for s in skipped if not s[2].startswith("section ")]
    other = len(skipped) - len(drink_skips)
    print("Skipped in drink sections: %d" % len(drink_skips), file=err)
    for sec, name, why in drink_skips:
        print("  [%s] %s: %s" % (sec, name, why), file=err)
    print("Skipped as items in non-drink sections: %d" % other, file=err)
    if not rows:
        print("WARNING: no coffee items found", file=err)


if __name__ == "__main__":
    main()
