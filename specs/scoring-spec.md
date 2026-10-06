# Scoring spec

> **Scoring v2 (user decision, 2026-10-06).** Sections 3 (match score), 4 (blanks), 5 (ranking and picking) and the tie-break below are **superseded by "Scoring v2" at the end of this file** once v2 is built; until then they describe the live v1 engine. Section 1 (answers to profile), section 2 (word mapping), the eligibility floor and the reason-line templates (section 6) still apply. Reason: the coverage blocker, see `IMPLEMENTATION.md` section 4.

Status: proposals approved by the user on 2026-10-06 (weights, cafe weight, tag columns, answer changes). Draft otherwise. Inputs: the 9 questions in REQUIREMENTS.md section 5, the tag vocabulary in section 4, and `tagging-rubric.md`. Where this spec adds a rule that REQUIREMENTS.md does not state, it is marked **Proposal** and needs sign-off.

## 1. From answers to tag points

Each answer lists tags in brackets. Points per tag in one answer:

- **Primary tag (first in the bracket): 2 points.**
- **Every other tag in the bracket: 1 point.**

**Proposal:** REQUIREMENTS.md gives no numeric weights, so the bracket order is read as priority. Example: "A gripping thriller [strong, bold]" gives strong +2, bold +1.

The quiz builds a **profile** P: a map from tag (dimension and value) to points. Tags from different answers add up. Questions are single choice, so a profile is built from exactly 9 answers. Conflicting tags (hot and iced) simply both accumulate.

## 2. Mapping quiz words to the vocabulary

Every quiz word is mapped to exactly one dimension and value. Words are unambiguous because each appears under only one dimension in section 4.

| Quiz word | Maps to | Type | Used in |
|---|---|---|---|
| strong | strength: strong | coffee | Q1, 2, 3, 4, 6, 7, 8, 9 |
| mild | strength: mild | coffee | Q5, 6, 8 |
| milk | milk: milk | coffee | Q1, 2, 9 |
| black | milk: black | coffee | Q2, 7, 8, 9 |
| plant milk | milk: plant milk | coffee | Q7 |
| sweet | sweetness: sweet | coffee | Q1, 2, 3, 4, 6, 7, 9 |
| dessert | sweetness: dessert | coffee | Q9 |
| hot | temperature: hot | coffee | Q5, 6 |
| iced | temperature: iced | coffee | Q5 |
| caramel | flavour: caramel | coffee | Q2, 7 |
| fruity | flavour: fruity | coffee | Q1, 7 |
| spiced | flavour: spiced | coffee | Q8 |
| classic | flavour: classic | coffee | Q5 |
| familiar | adventurousness: familiar | coffee | Q1, 3, 4 |
| curious | adventurousness: curious | coffee | Q1, 2, 3, 4, 5, 9 |
| bold | adventurousness: bold | coffee | Q1, 2, 3, 6, 7, 8 |
| cozy | vibe: cozy | cafe | Q2, 3, 4, 6, 8 |
| social | vibe: social | cafe | Q1, 4, 6, 9 |
| work-friendly | vibe: work-friendly | cafe | Q4, 9 |
| aesthetic | vibe: aesthetic | cafe | Q2 |
| quiet | crowd: quiet | cafe | Q4, 6, 7, 8 |
| lively | crowd: lively | cafe | Q1, 3, 4, 6, 8, 9 |
| medium | strength: medium | coffee | Q3, Q5 |
| none | sweetness: none | coffee | Q7 |
| light | sweetness: light | coffee | Q8 |
| chocolate | flavour: chocolate | coffee | Q8 |
| nutty | flavour: nutty | coffee | Q7 |
| quick stop | vibe: quick stop | cafe | Q5 |
| chain | setting: chain | cafe | Q1 |
| pub or brewery | setting: pub or brewery | cafe | Q6 |

Notes on words that could confuse:
- "sweet" is the sweetness value, not a personality word. "dessert" is a sweetness value (in the vocabulary it sits under sweetness), so Q9D "dessert" is a coffee tag.
- "black" is the milk value `black`, not the colour. "classic" is the flavour value, not the adventurousness value (that one is `familiar`).
- "cozy" and "aesthetic" are cafe vibe tags, so they score against the cafe, not the drink.

### Gaps and conflicts between the quiz and the vocabulary

Status after the user's sign-off on 2026-10-06:

1. **"either" in Q5C:** resolved. The answer was deleted and replaced with "A quick one on the go [medium, quick stop]".
2. **Vocabulary values no answer asked for:** resolved for medium, none, light, chocolate, nutty, quick stop, chain and pub or brewery, which now appear in answers (see the table above). Still open and accepted for the MVP: honey and vanilla have no flavour value.
3. **Sweet versus dessert is exact-match only:** still open. Half credit for the neighbouring value is a possible later change.
4. **Tie-break:** resolved. REQUIREMENTS.md section 6 now uses the lower `popularity_rank`.
5. **Schema gap:** resolved. REQUIREMENTS.md section 3a now has the tag columns and basis columns from `tagging-rubric.md` rule 5.

## 3. Match score

Weights, as integers so ties are exact:

- A matched **coffee** tag earns its profile points x **2**.
- A matched **cafe** tag earns its profile points x **1** (cafe tags have half the weight; **Proposal**, the constant is `CAFE_WEIGHT = 1` against `COFFEE_WEIGHT = 2`).

For a coffee row with tag set T_coffee and its cafe's tag set T_cafe:

```
raw   = 2 * sum( P[t] for t in T_coffee if t in P )
      + 1 * sum( P[t] for t in T_cafe   if t in P )

max   = 2 * sum( P[t] for coffee-type t in P )
      + 1 * sum( P[t] for cafe-type t in P )

match % = round( 100 * raw / max )        (display only)
```

- A tag matches when the dimension and the value are both equal. A multi-value dimension (flavour, vibe) can match on each value separately.
- `max` is the same for every coffee, so ranking uses `raw` alone. The percentage is for display and is not shown if the team prefers not to.
- Cafe tags are shared by all of a cafe's drinks, so they lift or lower the whole cafe equally. Drink-level differences decide which drink of the cafe wins.
- Price is not used and is not in the database (user decision, 2026-10-06).
- Tag basis (stated or inferred) does not change the weight. All tags count in full. The basis is shown to reviewers only.

## 4. Coffees with missing tags

- A blank coffee or cafe tag matches nothing and earns 0 points. It is not penalised further. The coffee is never given a guessed value.
- **Eligibility floor (Proposal):** a coffee needs at least 3 of the 6 coffee dimensions filled, otherwise it is not ranked. Rationale: with fewer, a high score would rest on almost nothing. A missing `popularity_rank` does not make a coffee ineligible. It is treated as worst in the tie-break (section 5).
- The reason line (section 6) names only tags that actually matched, so a blank never appears in a reason.
- If fewer than 3 distinct cafes have eligible coffees, lower the floor to 1 dimension, then return as many as exist. With the full dataset this should not happen.

## 5. Ranking and picking the top 3

1. Score every eligible coffee row (section 3).
2. Sort by, in order:
   1. `raw` score, higher first.
   2. `popularity_rank`, lower first (blank counts as worst). Tie-break per the brief.
   3. `sno`, lower first. This only decides ties inside one cafe, or two cafes with equal rank, so the output is deterministic.
3. Walk the sorted list from the top. Take a coffee if its cafe is not already picked. Skip it otherwise. Stop at 3 picks.
4. Cafe identity is the `cafe` column. A franchise is one cafe, so it can appear at most once.
5. Results are shown in pick order (1 = best). Each card shows coffee, cafe, Maps link (only when not `Any`) and the reason.

A zero-score pick is allowed if the top 3 distinct cafes run out of matches. It then uses reason template T4.

## 6. Reason line template

Build two lists from the tags that matched:

- `coffee_tags`: matched coffee tags, ordered by profile points (high first), then by dimension order strength, sweetness, milk, temperature, flavour, adventurousness. Keep the first 3.
- `cafe_tags`: matched cafe tags, ordered the same way, vibe then setting then crowd. Keep the first 2.

Display the value only ("strong", "iced", "work-friendly", "pub or brewery", "plant milk"). Join lists as: one = `x`; two = `x and y`; three = `x, y and z`.

| Case | Template |
|---|---|
| T1: coffee and cafe tags matched | `Matches your {coffee_tags} taste, and {cafe} is {cafe_tags}.` |
| T2: coffee tags only | `Matches your {coffee_tags} taste.` |
| T3: cafe tags only | `{cafe} is {cafe_tags}, which fits your vibe.` |
| T4: nothing matched | `A popular pick worth trying.` |

Sentence case, plain words, no emoji. The result page carries one footnote: "Tags are worked out from menu wording and may be off." This covers inferred tags without marking each one.

## 7. Worked example: Dyu Art Cafe

> **Status note (2026-10-06): the numbers below are historical.** They were worked out before the vibe tagging pass finished. The live data now gives Dyu `cozy` (not `quiet`), no `crowd`, and no plain Espresso, so the tables here no longer match `quiz_data.json` (for answer set 1 the live top 3 for Dyu are Filter Coffee 33, Vietnamese Iced Coffee 29, Iced Coconut Water Americano 21). The profile totals and the scoring rules below are still correct. From iteration round 1 the worked examples are checked against **frozen fixtures** in `web/tests/fixtures/` (a small, fixed copy of cafes and coffees), not against the live data, so they cannot drift again. The live data is covered by the data-integrity and exhaustive-coverage tests (REQUIREMENTS section 10).

> **Corrections to the printed tables (2026-10-06).** An independent scorer (a separate script that parses the questions from REQUIREMENTS.md and the Dyu drinks from `tagging-rubric.md` section 4) and the app code agree with each other and differ from the tables below in four places: **Set 1:** the profile also holds `none` 1 (Q7A), so max = 2 x 25 + 3 = 53 and Espresso scores **39**, not 37 (Filter Coffee 33 and Vietnamese Iced Coffee 29 are right). **Set 2:** Cafe Miel (sweet, milk, hot) scores **31** and is third, ahead of Vietnamese Iced Coffee (27). **Set 3:** the profile has more matched tags than listed; the live results are Iced Caramel Latte **13**, Iced Coconut Water Americano **13** (tie, lowest id first), Vietnamese Iced Coffee **11**. **Set 4:** Cafe Miel also scores **29**, so the 29-point tie is Affogato, Melange, Cafe Miel, Vietnamese Iced Coffee in id order. The tests (`web/tests/scoring.test.ts`) assert the corrected numbers. The tables themselves are left as written for history.

Dyu cafe tags: work-friendly, aesthetic, quiet (the `boutique` setting was dropped on 2026-10-06 and the example recomputed). Drink tags are from `tagging-rubric.md` section 4. Answers are listed as option letters for Q1 to Q9. Dyu is the only cafe in this example, so it shows the scoring and the tie-breaking; the three-cafe rule is shown after it.

### Answer set 1: "the thriller person" (A A A B A B A D A)
Profile: strong 12, bold 7, work-friendly 3, hot 2, black 2, classic 1. Max = 2 x 24 + 3 = 51.

| Rank | Drink | Matched | raw | % |
|---|---|---|---|---|
| 1 | Espresso | strong, black, hot, classic; work-friendly | 37 | 73 |
| 2 | Filter Coffee | strong, hot, classic; work-friendly | 33 | 65 |
| 3 | Vietnamese Iced Coffee | strong, classic; work-friendly | 29 | 57 |

Reason for Espresso (T1): "Matches your strong, black and hot taste, and Dyu Art Cafe is work-friendly."

### Answer set 2: "the cozy sweet tooth" (B B B A A A B A B)
Profile: cozy 9, sweet 8, milk 4, hot 3, familiar 2, caramel 2, quiet 1, classic 1, mild 1. Max = 2 x 21 + 10 = 52 (coffee points: sweet 8, milk 4, hot 3, familiar 2, caramel 2, classic 1, mild 1). Dyu has no `cozy` tag, so 9 of the cafe points are unreachable here.

| Rank | Drink | Matched | raw | % |
|---|---|---|---|---|
| 1 | Cafe Mocha | sweet, milk, hot, familiar; quiet | 35 | 67 |
| 2 | Iced Caramel Latte | sweet, milk, caramel, familiar; quiet | 33 | 63 |
| 3 | Vietnamese Iced Coffee | sweet, milk, classic; quiet | 27 | 52 |

Reason for Cafe Mocha (T1): "Matches your sweet, milk and hot taste, and Dyu Art Cafe is quiet." Salted Caramel Latte scores only 23 because it is tagged dessert, not sweet (gap 3).

### Answer set 3: "the iced party person" (D D D C B D D B D)
Profile: lively 11, social 5, strong 2, iced 2, fruity 2, caramel 1, aesthetic 1, familiar 1, sweet 1, bold 1, spiced 1, dessert 1. Max = 2 x (strong 2 + iced 2 + fruity 2 + caramel 1 + familiar 1 + sweet 1 + bold 1 + spiced 1 + dessert 1 = 12) + (lively 11 + social 5 + aesthetic 1 = 17) = 41.

| Rank | Drink | Matched | raw | % |
|---|---|---|---|---|
| 1 | Vietnamese Iced Coffee | strong, sweet, iced; aesthetic | 11 | 27 |
| 1= | Iced Caramel Latte | sweet, iced, caramel, familiar; aesthetic | 11 | 27 |
| 1= | Iced Coconut Water Americano | iced, fruity, bold; aesthetic | 11 | 27 |

Three drinks tie on 11. All are Dyu, so `popularity_rank` is equal and `sno` decides (lowest `sno` first). Dyu has no `lively` or `social` tag, so Dyu is a weak cafe for this person, and the picks from two other cafes should outrank most of Dyu's drinks.

### Answer set 4: "the curious explorer" (C C C D D C C C C)
Profile: curious 12, quiet 5, black 3, plant milk 2, fruity 1, mild 1. Max = 2 x 19 (curious 12 + black 3 + plant milk 2 + fruity 1 + mild 1) + 5 (quiet 5) = 43.

| Rank | Drink | Matched | raw | % |
|---|---|---|---|---|
| 1 | Cold Brew Coffee | curious, black; quiet | 35 | 81 |
| 2 | Affogato | curious; quiet | 29 | 67 |
| 2= | Melange | curious; quiet | 29 | 67 |
| 2= | Vietnamese Iced Coffee | curious; quiet | 29 | 67 |

Reason for Cold Brew (T1): "Matches your curious and black taste, and Dyu Art Cafe is quiet."

### The three-cafe rule, shown with made-up cafes
Take answer set 1 and add two imaginary cafes. Cafe B (`popularity_rank` 12) has a best drink scoring 33. Cafe C (`popularity_rank` 5) has a best drink scoring 29. Dyu has `popularity_rank` 20.

Sorted list: Dyu Espresso 37; then Dyu Filter Coffee 33 and Cafe B's drink 33 (tie, B wins on rank 12 < 20); then Dyu Vietnamese 29 and Cafe C's drink 29 (tie, C wins on rank 5 < 20).
Walk: pick Dyu Espresso. Next is Cafe B (33). Dyu Filter Coffee is skipped (Dyu already picked). Next is Cafe C (29). Result: Dyu, Cafe B, Cafe C, in that order.

## 8. Scoring v2 (planned 2026-10-06; parameters confirmed after the lab)

Goal: spread the recommendations across the database while keeping every pick close to the best match. Why: `IMPLEMENTATION.md` section 4. Parameters live in `web/lib/scoring-config.ts`; the values below are starting points, and the lab report (`web/test-results/lab/scoring-lab.md`) decides the final ones, recorded here when locked.

### 8.1 Weights

- **Rarity weight.** For a tag value `t`: `idf(t) = clamp( ln((N+1)/(n_t+1)) / mean , 0.6 , 1.8 )`, where `N` is the number of coffees (for coffee tags) or cafes (for cafe tags), `n_t` the number carrying `t`, and `mean` the average of `ln((N+1)/(n+1))` over all tag values of that kind, so the average weight is 1. Computed once from the loaded data.
- **Coffee part.** `coffee = sum over matched coffee tags of P[t] x idf(t)`.
- **Cafe part (capped and normalised).** For each cafe dimension (`vibe`, `setting`, `crowd`) the profile asks about, take the best matched tag only: `d = max P[t] x idf(t)` over the cafe's matched tags in that dimension, divided by the best value the profile could earn in that dimension (so `d` is between 0 and 1). A dimension the cafe has no data for counts **0.5** (neutral), not 0. `cafe = CAFE_SCALE x average of d over the asked dimensions`.
- **Score.** `score = (COFFEE_WEIGHT x coffee + CAFE_WEIGHT x cafe) x (1 + ALPHA x prior(rank))`, with `prior(rank) = 1 - (rank - 1) / maxRank` between 0 and 1, and 0 when `popularity_rank` is blank. Starting values: `COFFEE_WEIGHT = 2`, `CAFE_WEIGHT = 1`, `ALPHA = 0.08`. **Final form (built):** each part is normalised to 0..1: `score = ((1 - CAFE_SHARE) x coffee/maxCoffee + CAFE_SHARE x cafeNorm) x (1 + ALPHA x prior)`, and the cafe's rank score is multiplied by `menuFactor = 1 - MENU_PENALTY x ln(1 + menu size) / ln(1 + biggest menu)`; `CAFE_SHARE = 0.30`, `MENU_PENALTY = 0.12`, bands 0.97 / 0.90 / 0.80, `COFFEE_BAND = 0.95`, `TAU = 0.16` (slot 1 uses TAU/4, slot 2 TAU/2, slot 3 TAU). Values live in `web/lib/scoring-config.ts`.
- The eligibility floor and its relaxation (section 4 above) are unchanged. The blank-tag rule changes only for cafe dimensions (neutral 0.5); a blank coffee tag still earns 0 and is never guessed.

### 8.2 Picking

Seeded random generator `rng` (see 8.3). With no `rng` the engine runs deterministically: it takes the top of each band and breaks ties by the hash of a fixed seed.

1. For every cafe, collect its coffees within `COFFEE_BAND` (0.95) of the cafe's best score and draw one by weight `exp((score/best - 1) / TAU)`. The cafe's score is that coffee's score.
2. **Slot 1, Best match:** draw a cafe from those within `BAND_1` (0.97) of the top cafe score, weighted strongly towards the top (tau/4). **This band is never widened** (decided after the first full run: widening let a weaker cafe take the Best match, mean quality 0.967, worst 0.733; not widening gives 0.989, worst 0.875).
3. **Slot 2, Close match:** draw from cafes within `BAND_2` (0.90) of the top score, excluding slot 1's cafe.
4. **Slot 3, Wildcard:** draw from cafes within `BAND_3` (0.80), excluding slots 1 and 2, with weight `1 / (1 + prior)` so lesser-known and unranked cafes are favoured. For slots 2 and 3, if the band holds fewer than `MIN_CANDIDATES` (8) cafes, widen it by taking the next best until it does.
5. Any remaining exact tie is ordered by `hash(seed, cafe, coffee id)`. `popularity_rank` no longer breaks ties; it acts only through `ALPHA`.
6. Results are shown in slot order, labelled "Best match", "Close match" and "Wildcard". The reason line is built exactly as in section 6, from matched tags only.

Hard rules (asserted by tests): 3 results from 3 different cafes; the same answers, roll and data always give the same results; slot scores stay above the floors in `IMPLEMENTATION.md` section 4 and REQUIREMENTS section 10.

### 8.3 Seeding

`seed = hash(answer letters + roll)`. `roll` is a random 32-bit number drawn when results are revealed; "Show different picks" draws a new one. The generator is mulberry32 in `web/lib/rng.ts`.
