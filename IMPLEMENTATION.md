# Bengaluru Coffee Quiz: Implementation

Status: started 2026-10-06 at the user's request (the course flow had skipped it until now). This is the **how** document. [`REQUIREMENTS.md`](REQUIREMENTS.md) is the **what and why** (the PRD) and the rules live in [`specs/`](specs/); this file links to them and does not repeat them. Where the code and a document disagree, flag it and fix the document first.

Sections marked **(planned)** describe work that is agreed but not built yet. Numbers marked **(lab)** are filled in after the scoring lab runs.

## 1. Architecture

A static Next.js app (App Router, TypeScript, Tailwind v4 for the base layer plus plain CSS tokens). There is no server-side code and no database: the whole recommender runs in the browser on one JSON file.

```
data pipeline (Python, local)            quiz app (web/, Next.js)
OSM/Overture + Zomato/Swiggy + menus --> data/coffee_database.csv, cafe_tags.csv
                                         data/export_for_app.py
                                                  |
                                          data/quiz_data.json  --copy-->  web/public/quiz_data.json
                                                                             |
   browser:  landing -> 9 questions -> answers (tag words) -> profile -> score every coffee
                                          -> pick 3 cafes -> result cards + scene
```

| Path | Role |
|---|---|
| `data/` | Pipeline scripts and the final database (CSV and the packed `quiz_data.json`). Not edited by the app work. |
| `web/lib/questions.ts` | The 9 questions and their tag lists (source: REQUIREMENTS section 5). |
| `web/lib/scoring.ts` | The recommender (profile, scoring, picking, reason lines). |
| `web/components/`, `web/app/` | UI. |
| `web/tests/`, `web/e2e/` | Unit, data, coverage and browser tests. |
| `specs/` | Tagging rubric, scoring spec, scene spec. |
| `design/` | Research notes, photo shortlist, credits. |

## 2. Data contract

`web/public/quiz_data.json` (identical to `data/quiz_data.json`; a test fails if they drift):

- `cafes`: object keyed by cafe name: `maps_link` (URL, or `Any` for franchises), `type` (`franchise` or `standalone`), `popularity_rank` (integer or null), `vibe` (array), `crowd` and `setting` (string or null).
- `coffees`: array of `{ id, cafe, name, strength, sweetness, milk, temperature, flavour[], adventurousness }`. Blank tags are null. 13 rows carry `temperature: "hot|iced"`, which the engine splits into two tags. No price anywhere.
- Size at the 2026-10-06 export: 3,286 coffees, 227 cafes, about 640 KB. Vocabulary: REQUIREMENTS section 4 and `specs/tagging-rubric.md`.

## 3. The scoring engine

### 3.1 v1 (built in lesson 4.3)

Rules in [`specs/scoring-spec.md`](specs/scoring-spec.md) sections 1 to 6. In one line: each answer adds points to tags (first tag 2, others 1); a coffee scores `2 x matched coffee-tag points + 1 x matched cafe-tag points`; take the best coffee of each cafe, sort, keep the top three cafes; ties go to the better `popularity_rank`. Implemented in `web/lib/scoring.ts`; the frozen copy lives in `web/tests/lab/v1.ts` (planned) as the reference.

### 3.2 v2 (built 2026-10-06): spread the recommendations

See section 4 for why, and [`specs/scoring-spec.md`](specs/scoring-spec.md) "Scoring v2" for the exact rules. Summary: rarity-weighted tags, a capped and normalised cafe bonus with neutral credit for missing cafe data, a small popularity prior, seeded random picking from near-best bands, three result roles (best match, close match, wildcard), and a hash-based tie-break.

## 4. The coverage blocker and how we resolved it

### 4.1 What we found

Phase 1 of the iteration round added an exhaustive test: every one of the 4^9 = 262,144 possible answer combinations was run through the v1 recommender on the real database (`web/tests/coverage.test.ts`, report in `web/test-results/coverage.md`). Every combination produces a distinct profile, so the result is exact, not sampled.

| Measure (v1, 2026-10-06 data) | Result |
|---|---|
| Coffees that can ever appear in a result | **574 of 3,286 (17.5%)** |
| Coffees that can ever be ranked first | 344 (10.5%) |
| Cafes that can ever appear | **128 of 227 (56.4%)** |
| Cafes that can never appear | 99 (for example Chai Point, Lavonne, The Filter Coffee) |
| Eligible coffees (at least 3 of 6 coffee dimensions filled) | 3,065 (93.3%); cafes with one: 222 of 227 |
| Most common cafe (BANOFFEE) | in **83,485 of 262,144 quizzes (31.8%)** |
| Zero-score results | 0 |

So the 227-cafe, 3,286-coffee database that took most of the project to build is mostly invisible to the quiz. This is the **coverage blocker**: a quiz that keeps recommending the same 128 cafes, a third of the time the same one, is not the product described in REQUIREMENTS section 1 ("3 recommendations they would actually go and try").

### 4.2 Why it happens (root causes)

1. **The cafe bonus is shared by every drink at a cafe.** A cafe tagged with three vibes (for example BANOFFEE's lively and social) gets cafe points on all of its drinks, and those drinks beat everyone else's.
2. **Hard ties and a fixed winner.** Scores are small whole numbers, so many coffees tie, and the tie-break (`popularity_rank`) always favours the same cafes.
3. **Common tags barely separate coffees.** `familiar`, `classic` and `medium` sit on roughly half the database, so matching them says little.
4. **Thin cafe data.** 159 cafes have no `crowd` tag and 11 have no `vibe`, so under the v1 rule "a blank earns 0" they cannot earn cafe points that other cafes can.
5. **Only three cafes win per quiz.** With 227 cafes, any skew in the scoring is amplified.

### 4.3 The ideas we brainstormed (2026-10-06)

| # | Idea | Decision |
|---|---|---|
| 1 | Cap and normalise the cafe bonus (one matched tag per dimension, normalised) | **Adopted** |
| 2 | Rarity (idf-style) weighting of tags | **Adopted** |
| 3 | Seeded "soft top-N": draw from coffees close to the best score | **Adopted** (the user's idea of adding randomness) |
| 4 | Hash tie-break instead of popularity rank | **Adopted** |
| 5 | Role slots: best match, close match, wildcard (lesser-known cafe) | **Adopted**; this is also where the requested slight skew towards popular cafes lives (a small popularity prior) |
| 6 | Diversity re-ranking (picks differ in vibe, setting or area) | Deferred: more rules to explain; revisit if 1 to 5 fall short |
| 7 | Exposure balancing (count how often each cafe is shown) | Deferred: needs shared storage and logging, not worth it for the MVP |
| 8 | Better data and more questions (fill vibe and crowd tags, a tenth question, multi-select) | Deferred: a data-pipeline job outside this round; the real long-term fix for thin cafe data |
| 9 | (found in the lab) Menu-size correction, and a baseline-lift correction | Menu-size correction (mild) adopted; baseline lift tested and dropped |

Why this order: fix the systematic bias with deterministic maths first (1, 2), then add controlled randomness (3, 4) and roles (5). Randomness alone would hide the bias instead of removing it.

### 4.4 How we measure it (planned)

A **scoring lab** (`npm run lab`, outside the normal test run) replays every answer combination through each variant of the scoring (the frozen v1, then adding each idea one by one, then the full v2), plus sampled profiles under many random seeds for the random variants. It reports: cafes and coffees reachable, share of the most common cafe and of the top 10, Gini concentration, quality (a pick's score as a share of the best possible), and the cafes that stay unreachable. The final parameters are chosen from that table and shown to the user before they are locked. The agreed targets are in the plan and in REQUIREMENTS section 10 once confirmed.

### 4.4a Lab results (2026-10-06, 60,000 sampled quizzes out of 262,144, the same quizzes for every variant)

Adding the ideas one at a time (reach is on the 222 cafes and 3,065 coffees that have at least 3 of 6 coffee dimensions filled):

| Variant | Cafes seen | Coffees seen | Top cafe share of quizzes | Top-10 cafes' share of picks | Gini (0 = even) |
|---|---|---|---|---|---|
| V1 frozen v1 engine | 55% | 16% | BANOFFEE 31.8% | 55.5% | 0.88 |
| V2 + idea 1: cap and normalise the cafe bonus | 62% | 25% | BANOFFEE 35.7% | 58.9% | 0.89 |
| V3 + neutral credit for missing cafe data | 73% | 30% | BANOFFEE 30.0% | 50.7% | 0.85 |
| V4 + idea 2: rarity weights | 69% | 24% | BANOFFEE 30.6% | 52.5% | 0.85 |
| V5 + popularity prior and hash tie-break (ideas 4) | 59% | 20% | BANOFFEE 30.9% | 51.2% | 0.86 |
| V6 + ideas 3 and 5: seeded soft top-N and role slots (first settings) | 90% (all rolls: 91%) | 48% (all rolls: 51%) | BANOFFEE 23.2% | 40.2% | 0.78 |

What this teaches: **the deterministic fixes alone barely help** (and the cap on its own made the top cafe worse, because cafes with complete tags gained relative to ones with gaps). **The seeded random bands do most of the work.** That confirms the order we chose (fix the bias, then add randomness) was right only in part: the randomness is the lever that actually moves coverage.

A second finding: **a cafe with a large menu has more chances to contain a high-scoring drink**, and BANOFFEE (25 drinks, complete cozy, social and lively tags) wins on both. A menu-size correction was added to the lab (shrinks a cafe's score by up to a set share, growing with the logarithm of its menu size). A strong correction (25%) overshoots: tiny-menu cafes such as Hatti Kaapi (2 drinks) and Zoey's become the most common cafe. A mild one (12%) helps without that effect.

A third finding: **the crowd tag is only present on 68 cafes and `lively` on just 18**, and many quiz answers ask for lively or social, so the few lively cafes legitimately match many profiles. This is thin data, not a scoring bug (idea 8, deferred).

A parameter sweep over cafe share (0.15 or 0.30), menu-size correction (0, 0.12, 0.25), band widths and spread (24 settings, 20,000 quizzes each) gave: cafes seen 87% to 98%, coffees seen 39% to 56%, top cafe 12% to 26%, top-10 share 29% to 39%. **No setting reaches the original target of "no cafe in more than 8% of quizzes" without lowering match quality**; the best settings reach 13% to 17%. A further idea tested and dropped: a "baseline lift" correction (divide a cafe's chance by how well it matches an average quiz); it moved the top cafe from 14.9% to 13.3% at best, not worth the complexity.

### 4.4b Cafe-data fix (idea 8): pilots and a simulation (2026-10-06)

The plan was to research the 159 cafes without a `crowd` tag (they hold 72.6% of all coffees) and fill the gaps with web search. Before scaling, a **blind calibration pilot** ran the research method on cafes that already have a crowd tag, without showing the agents those tags (acceptance bar: commits on at least half of the cafes and agrees at least 75% of the time when it commits):

| Pilot | Method | Committed | Agreement when committed | Notes |
|---|---|---|---|---|
| 1 (20 cafes) | strict: own copy or two independent cues; mixed stays blank | 7 of 20 (35%) | 7 of 7 (100%) | below the commit bar; found lively cafes poorly (3 of 10) |
| 2 (20 fresh cafes) | looser: counts platform labels, lean and confidence on every cafe, commits at medium or high | 9 of 20 (45%) | 8 of 9 (89%) | just below the commit bar; 8 of 8 lively cafes were not committed as lively (3 leaned lively at low confidence, 1 was wrongly called quiet) |

Reading: web search finds **quiet** cafes reliably and **lively** cafes badly, and the shortage that matters is `lively` (18 cafes). A full pass would therefore mostly add `quiet` tags. The existing labels are also noisy (several rest on thin evidence).

**Files kept from the skipped pass:** `data/tagging/crowd_pass/` (the research brief, the 40 pilot cafes and the pilot results) and `data/merge_crowd.py` (a ready, validated merge script, not run on real data). They are the starting point if the crowd and vibe gaps are tackled later.

**Simulation (lab, `scoring-lab-simfill.md`):** randomly filling crowd tags on the blank cafes, in six scenarios from 45% filled with almost no lively tags up to 100% filled with half lively, under the Quality-first settings, left the spread **unchanged or slightly worse** (top cafe 15% to 21% against 17% today; cafes seen 92% to 94%; coffees seen 46% to 50%). With rarity weights, a capped cafe bonus and a neutral 0.5 for missing data, more crowd tags move reach by a few points either way. **The crowd-tag fix is not a lever for the coverage blocker under v2.** It would only be a data-quality improvement.

Full tables: `web/test-results/lab/` (`scoring-lab.md`, `scoring-lab-sweep.md`, `scoring-lab-lift.md`; not committed). **Decision (2026-10-06): Quality-first** (bands 0.97 / 0.90 / 0.80, tau 0.16, menu-size correction 0.12, cafe share 0.30, popularity prior 0.08): on the 20,000-quiz sample it reached 92% of cafes, 47% of coffees, top cafe about 17%, top 10 cafes 32% of picks, mean quality 0.97 / 0.93 / 0.87. The cafe-data fix (idea 8) was piloted and skipped (section 4.4b), so these parameters stand. Final numbers on all 262,144 quizzes: section 4.6.

### 4.5 Guard rails

- Every random choice is seeded, so a result can be reproduced and tested.
- A pick is only drawn from a band close to the best score, so the quality stays high and the reason line (built only from tags that matched) stays honest.
- The data is not touched. If the lab shows v2 cannot reach the targets, the report says so and the next steps are the deferred ideas, not forced numbers.

### 4.6 Result: scoring v2 on all 262,144 quizzes (2026-10-06)

Run by `npm run test:coverage` (one seeded roll per answer combination, plus 1,000 sampled profiles x 25 rolls for the "ever appears" numbers); full report in `web/test-results/coverage.md` (not committed).

| Measure | v1 | v2 (built) | Target |
|---|---|---|---|
| Cafes that can ever appear (of 222 with an eligible coffee) | 128 of 227 (56.4%) | **214 (96.4%)** | at least 90% |
| Coffees that can ever appear (of 3,065 eligible) | 574 of 3,286 (17.5%) | **1,882 (61.4%)** | at least 45% |
| Most common cafe, share of all quizzes | BANOFFEE 31.8% | **BANOFFEE 19.3%** | at most about 18% (asserted at 20%) |
| Top-10 cafes' share of all picks | 55.5% | **34.1%** | at most 35% |
| Best match quality (score as a share of the best), mean / 1st percentile / worst | 1.00 | **0.989 / 0.928 / 0.875** | mean at least 0.97 |
| Close match quality | 0.97 | 0.928 / 0.814 / 0.690 | mean at least 0.92 |
| Wildcard quality | 0.95 | 0.869 / 0.765 / 0.693 | mean at least 0.85 |
| Time per quiz | 0.5 ms | 0.46 ms | under 50 ms at the 95th percentile |

**One refinement after the lab:** the Best match band is never widened to the best 8 cafes (only the Close match and the Wildcard are). With widening the Best match averaged 0.967 and was as low as 0.733 of the best score, but the most common cafe was 17.4% and the top-10 share 32.2%; without it the Best match averages 0.989 (worst 0.875) at the cost of 19.3% and 34.1%. Chosen because the decision was Quality-first. It is a one-line switch (`slot !== 1` in `lib/scoring.ts`) if you prefer the other trade.

**Still never recommended (8 cafes that have an eligible coffee):** The Fat Chef, Ovenly Bliss, The Platonic Cafe, The Brownie Circles, Anaia, Thela Tapri By Sharma's Kitchen, Happiness Dhaba and The Estate Table. Seven have a single drink and thin tags; a one-drink cafe has no second drink to be the best of, and the menu-size correction does not lift it above cafes with a better match.

**Where the remaining concentration comes from:** BANOFFEE (25 drinks, complete cozy, social, lively tags) and Third Wave Coffee (39 drinks) legitimately match many profiles, and only 18 cafes carry the `lively` tag. The cafe-data fix was piloted and skipped (section 4.4b), because a simulation showed it would not change this much; better crowd and vibe data remains a possible later job.

### 4.7 Desktop result page and mobile web compatibility (built 2026-10-06)

Desktop web is the base layout; two `max-width` layers adapt it (tablet up to 1023 px, phone up to 767 px). What changed: the result page is two columns on desktop (scene, heading and actions on the left, three compact cards on the right); the cafe name is bold at 18 px with a pin, the coffee name smaller (up to 22 px), both clamped to two lines; long cafe names split at " - " into a name and a subtitle (`lib/display.ts`, display only); the landing start button moved up; phones get a sticky Back/Next bar, a sticky actions bar on the results, one-column cards, a scrollable info strip and a short banner; hover lifts apply only where hover exists; focus rings, safe-area padding, `100dvh` and a `viewport` export were added.

Measured (Chrome with touch, user agent and pixel ratio emulated; before = v1 on 2026-10-06):

| Measure | Before | After |
|---|---|---|
| Landing start button bottom, 1280x720 / 1440x900 | 765 px (below the fold) | about 430 px (inside) |
| Landing start button, phones 360x640 to 412x915 | 764 to 850 px (below the fold) | inside the fold on all four |
| Result page height, desktop 1280x720 | 1,837 px | 722 px (the whole page, footnote included, is about one screen) |
| Result cards fully inside the first screen, 1280x720 | 0 of 3 | **3 of 3 in 40 of 40 random quizzes** (worst third-card bottom 669 px of 720) |
| Result cards, 1440x900 | 0 of 3 | 3 of 3 in 40 of 40 (worst 653 px) |
| Coffee name / cafe name font, desktop | 36 px / 15 px | 22 px / 18 px bold |
| Horizontal scroll at any tested size | none | none (and a bug that appeared while building, a landing grid stretched by the info strip, is fixed and tested) |
| Tap targets under 44 px | none | none |
| Accessibility (axe, WCAG 2 A and AA) | not tested | no violations on landing, a question and the results, on 8 sizes; two real issues were found and fixed (an unfocusable scroll strip, an unnamed progress bar) |

Low-end phone profile (6x slower CPU, slow 3G, production build): the quiz data is 655 KB raw but 49 KB gzipped; the page appears after about 8 s on slow 3G (dev build: 21 s, not representative); a recommendation takes about 240 to 300 ms on the slowed CPU, right at the 250 ms threshold, so the brewing screen does appear on such a phone. A `preload` of the data file removed a 2 s wait after the page appeared.

**Rules and limits:** the first-fold rules are asserted for phones in portrait; a phone held sideways (667x375) is too short for a fold rule, so it only has to scroll cleanly with slim sticky bars. WebKit (Safari's engine) cannot be installed here, so iPhone Safari is emulated through Chrome; a check on a real iPhone is still to do.

## 5. Randomness and seeding

- `seed = hash(answer letters + roll)`. `roll` is a random 32-bit number drawn when the results are revealed, so the same answers on different visits give different, equally good picks.
- A "Show different picks" button draws a new roll without redoing the quiz.
- A small seeded generator (`web/lib/rng.ts`, mulberry32) is injected into the engine; the browser passes the real seed, tests pass fixed ones. With no generator the engine runs in a deterministic mode used by the rule tests.

## 6. UI states (built)

`landing` > `quiz` (9 steps) > `brewing` (only if the work takes over 250 ms or the menus are still loading, shown for at least 700 ms) > `result`. The brewing screen is a full-card animated scene: an auto-rickshaw on a rainy road, a steel tumbler filling as the progress meter, and a departure board of real cafe names from the data, with captions tied to the real stages. Measured cost of one recommendation is about 0.5 ms, so on a normal device it will rarely show; it protects slow phones and any future server step. The captions describe the engine's steps in order and advance with time while the work finishes (they are not live progress). The results are set inside the timed work, so when the screen hides the results are already there (tested: no one-frame flash of the last question). Code: `web/lib/reveal.ts`, `web/components/BrewingScreen.tsx`; tests: `tests/reveal.test.ts` (timing with fake timers) and `e2e/reveal.spec.ts` (forced 1.5 s delay on every device size). Details: REQUIREMENTS section 7b.

**Loading animation (2026-10-06, user request):** instead of the text "Loading the menus…", the landing page shows a looping **coffee-pour animation** next to the disabled button (`web/components/CoffeePour.tsx`): a steel tumbler tips, a thin stream of coffee drops into the dish, the level rises, steam curls, and it repeats (3.2 s). The same animation is used inside the photo loader. It is our own animated SVG with CSS keyframes, not a Lottie file: no player library (a Lottie player is a 150 to 250 KB dependency), no third-party file or licence question in a public repo, and it matches the artwork. It is decorative; a screen-reader-only "Loading the menus…" status sits beside it, and under reduced motion it holds a still, mid-pour pose. If a specific Lottie is preferred later, it can replace the component without touching the rest.

## 7. Result scenes and photos (built 2026-10-06)

Scene chosen from the answers (`web/lib/scenes.ts`; each scene's points divided by its expected points so all eight scenes are chosen between 8.8% and 17.9% of the time), a random photo from that scene's curated pool (`web/data/scene-photos.json`, 66 Wikimedia Commons photos stored as links; `web/lib/photos.ts`), a drawn caricature on top (`Caricature.tsx`: guy, girl or both, scene accessories), a doodle loader while the photo loads, a drawn fallback scene per scene id (`FallbackScene.tsx`) after a failure or 6 s, and a credit line with author, licence and source under every photo (`PhotoCredit.tsx`). The photo is chosen and starts loading when the reveal starts, while the picks are computed; the cards never wait for it. Rules: REQUIREMENTS section 7 and [`specs/scene-spec.md`](specs/scene-spec.md).

**Source discovery.** `scripts/find_photos.py` queries the Wikimedia Commons API (by `curl` over IPv4 with a descriptive User-Agent) and keeps only CC0, public-domain, CC BY and CC BY-SA files at least 1600 px wide and landscape; `scripts/preselect.py` ranks them and builds contact sheets; `scripts/build_shortlist.py` writes the data file, the credits list and the review page. Openverse was not needed (its anonymous limit is 20 requests a minute and 200 a day; Commons gave enough). Wikimedia only serves hotlinked images at standard widths, so the app asks for 960 px (`Special:FilePath` with `?width=960`).

**Tests.** `tests/photos.test.ts` (licences, hosts, sizes, per-photographer and per-monument limits, credits match, no image files in the repo, seeded random choice), `tests/scenes.test.ts` (every scene reachable, none dominant), `e2e/scene.spec.ts` (loader, photo, credit, silent fallback on a 404 and after 6 s). Browser tests serve photos from a local stand-in (`e2e/fixtures.ts`) so they never depend on Wikimedia.

## 8. Testing

**Opening the dev server on a phone or another computer:** Next.js 16 blocks its development scripts for any host other than `localhost`, so a page opened at `http://<this Mac's address>:3000` shows but never runs: the Find my coffee button stays disabled on "Loading the menus…". `web/next.config.ts` lists the Mac's address in `allowedDevOrigins` (development only; if the address changes, update it and restart `npm run dev`). Found 2026-10-06 when a real-phone check failed; reproduced in Chrome by opening the app through the network address, and a test run through that address now passes. (An earlier guess, Firefox mishandling a data preload, was wrong: the preload was replaced by a plain early fetch anyway, which is harmless and kept.)

How to run (in `web/`): `npm test` (fast), `npm run test:coverage` (about 2 minutes), `npm run test:e2e`, `npm run test:all`. What is covered and why: REQUIREMENTS section 10. Browser tests use the installed Google Chrome, because Playwright's own browser download times out on this network; WebKit is not tested, so iPhone Safari is emulated only.

## 9. Phases and status

| Step | Status |
|---|---|
| Data pipeline (REQUIREMENTS section 9, phases 1 to 8) | Done |
| Quiz v1 (lesson 4.3) | Done |
| Iteration round 1, 10.0 docs, 10.1 test harness | Done |
| Scoring lab (variants, sweep) | Done; Quality-first settings chosen |
| Cafe-data fix (crowd, vibe, pub or brewery tags) | Piloted and skipped by decision (section 4.4b) |
| Scoring v2 (engine, brewing screen, role labels, "Show different picks", full coverage retest) | Done 2026-10-06 (section 4.6) |
| Desktop result page and layout, with mobile web compatibility | Done 2026-10-06 (section 4.7); scene photos still a placeholder |
| Photo set, scenes, caricature, loader, fallback | Built 2026-10-06; the photo list awaits the user's review |
| Final full run and cleanup (Phase 5) | Done 2026-10-06: 100 unit tests, exhaustive coverage run, browser suite, production build |
| GitHub (4.4) and Vercel (4.5) | Next; steps in REQUIREMENTS section 0 |

## 10. Decision log (2026-10-06)

- Photo source: a curated, hand-picked pool from Openverse and Wikimedia Commons, linked and credited, not stored in the repo (user decision).
- Platform: **desktop web first** (as originally built); **mobile web must be compatible**. The responsive layer sits on top of the desktop layout. The result page puts the cafe name above the coffee name and fits three cards in the first desktop fold (user decision).
- Coverage blocker found by the exhaustive test; ideas 1 to 5 adopted, 6 to 8 deferred; slight popularity skew requested; an engaging loading screen requested for slow waits; mobile is tested by Claude with screenshots, then by the user on a real phone.
- WebKit cannot be downloaded here; Chrome is used for all browser tests.
- Scoring v2 settings locked as **Quality-first** (rarity weights, capped and normalised cafe bonus, neutral 0.5 for missing cafe data, cafe share 0.30, popularity prior 0.08, menu-size correction 0.12, bands 0.97 / 0.90 / 0.80, tau 0.16). The original "no cafe above 8% of quizzes" target was replaced by about 18%, because the lab showed 8% unreachable without lowering match quality. The data fix was planned first, piloted, and skipped by decision because the pilots and a simulation showed it would not improve the spread; v2 is built next, then the UI work (user decisions).

## 11. Deployment notes

Follow REQUIREMENTS section 0, "Course path from here" (public repo `bengaluru-coffee-quiz`, Vercel root directory `web`). Nothing is committed or pushed yet.
