"""Score a blind crowd pilot (phase 10.1c, step D1).
Usage: python3 data/tagging/crowd_pass/score_pilot.py <pilot_truth.json> <output glob, e.g. output_pilot2_*.csv>
Acceptance (plan): agreement >= 75% on cafes where the method commits to a value, and it commits on >= 50% of the cafes.
Also reports accuracy of the always-filled `lean` column by confidence level, so the commit threshold can be chosen from data."""
import csv, glob, json, sys, collections
truth = json.load(open(sys.argv[1]))
rows = {}
for f in sorted(glob.glob("data/tagging/crowd_pass/" + sys.argv[2])):
    for r in csv.DictReader(open(f)): rows[r["cafe"]] = r
print(f"cafes with output: {len(rows)} of {len(truth)} | missing: {[c for c in truth if c not in rows]}")
committed = {c: r["crowd"] for c, r in rows.items() if c in truth and r["crowd"] in ("quiet", "lively")}
agree = [c for c, v in committed.items() if v == truth[c]]
print(f"committed: {len(committed)} of {len(truth)} ({round(100*len(committed)/len(truth))}%)")
print(f"agreement on committed: {len(agree)} of {len(committed)} ({round(100*len(agree)/max(1,len(committed)))}%)")
print("truth -> predicted:", dict(collections.Counter((truth[c], committed[c]) for c in committed)))
for c, v in committed.items():
    if v != truth[c]: print("  DISAGREE:", c, "| existing:", truth[c], "| pilot:", v, "|", rows[c].get("confidence", ""), "|", rows[c]["evidence"][:140])
if any("lean" in r for r in rows.values()):
    print("lean vs existing, by confidence:")
    for conf in ("high", "medium", "low", ""):
        sub = [c for c, r in rows.items() if c in truth and r.get("confidence", "") == conf and r.get("lean") in ("quiet", "lively")]
        ok = sum(1 for c in sub if rows[c]["lean"] == truth[c])
        if sub: print(f"  confidence {conf or '(none)'}: {ok} of {len(sub)} agree")
print("searches used:", sum(int(r["searches_used"] or 0) for r in rows.values()))
ok = len(committed) / len(truth) >= 0.5 and len(agree) / max(1, len(committed)) >= 0.75
print("PILOT", "PASSES" if ok else "FAILS", "the acceptance bar")
