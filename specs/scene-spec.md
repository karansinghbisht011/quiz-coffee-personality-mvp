# Scene spec

Status: proposal for iteration round 1 (user decisions of 2026-10-06: scenes are chosen from the person's answers; the photo is picked at random from a curated pool and the character varies at random). The affinity table is an **initial proposal**: it is tuned against the exhaustive distribution run in phase 10.4 (REQUIREMENTS section 9), and any change is recorded here with its reason. Layout is in REQUIREMENTS section 7b; art rules are in section 7.

## 1. Scenes

Fixed order (also the tie-break order):

| # | Scene id | Title shown | Caption idea | Affinity tags (quiz words) |
|---|---|---|---|---|
| 1 | `auto` | The Auto Wanderer | Quick stops and detours, nobody's idea of a straight line | quick stop, medium, spiced, curious |
| 2 | `traffic-police` | The By-the-Book Sipper | Whistle, signal, same trusted order every time | classic, familiar, chain, light |
| 3 | `traffic-jam` | The Gridlock Survivor | Strong, black and bold, because the jam is long | strong, bold, black, none |
| 4 | `weather` | The Monsoon Mood | Rain at 5 pm calls for something warm and sweet | cozy, hot, sweet, milk |
| 5 | `signal` | The Signal Socialiser | Red light, loud friends, iced cups | lively, social, iced, pub or brewery |
| 6 | `landmarks` | The Landmark Lingerer | Slow mornings near the city's best-known spots | aesthetic, quiet, mild, nutty |
| 7 | `tech-park` | The Tech-Park Regular | Laptop open, filter of the day, one more commit | work-friendly, strong, medium, plant milk |
| 8 | `pov-cup` | The Window-Seat Dreamer | Your view, with a cup in hand | black, curious, dessert, fruity |

Titles and captions are playful and carry no claim about a real place. A caption that names a real place comes from the photo's own source text (section 4), never from this table.

## 2. Choosing the scene

**Built form (2026-10-06):** the first version, raw profile points, was badly skewed over all 262,144 answer sets (traffic police 0%, landmarks 0.8%, traffic jam 33.6%, weather 29.1%), because words such as "strong" appear in many answers. Each scene's points are therefore **divided by the points its four words earn on average over all answers** (a lift). Measured result: auto 8.8%, traffic police 17.9%, traffic jam 9.2%, weather 12.1%, signal 17.3%, landmarks 16.0%, tech park 8.9%, window-seat 9.8%; every scene reachable, none above 18%. Tested in `web/tests/scenes.test.ts` (reachable above 3%, none above 30%). The rules below still describe the idea; the division by expected points is the one change.

1. Build the profile exactly as in `scoring-spec.md` section 1 (first tag 2 points, others 1).
2. For each scene, `score = sum of profile points on its affinity tags` (a tag word counts once, matching the quiz word whatever its dimension; coffee and cafe tags are not weighted differently here).
3. The scene with the highest score wins. Ties go to the lower scene number in the table.
4. If every score is 0 (not reachable with real answers, but defined for safety), use `auto`.

Properties the tests check: every scene can be chosen by some set of answers; no scene is chosen for more than a set share of all answer combinations (threshold agreed after the first distribution run); the choice is deterministic.

## 3. Choosing the variant (random)

- `character`: `guy`, `girl` or `both`, uniformly at random.
- `photo`: one photo picked uniformly at random from that scene's approved pool in `web/data/scene-photos.json` (REQUIREMENTS section 7), never the same as the previous one shown.
- The random source is injected (`rng: () => number`, in `[0, 1)`). The browser uses `Math.random`; tests use a seeded generator. "Take it again" draws new values.

## 4. The photo pool per scene

**Built pool (2026-10-06):** 66 photos from Wikimedia Commons, chosen by eye from about 160 pre-selected candidates (found by `scripts/find_photos.py`, 605 candidates after the licence, size and shape filters): autorickshaw 8, traffic police 7, traffic jam 7, weather 10, signal 6, landmarks 10, tech park 10, window-seat 8. 53 are stated as Bengaluru by their own source text; the others carry their real place (Kolkata, Goa, Mysuru, Dharwad, Coorg) and are captioned "Photo from <place>". Two honest gaps: **no openly licensed Sarjapur Road signal photo exists on Commons**, so the signal scene uses other junctions (MG Road and Brigade Road at night, Silk Board, a traffic circle); **traffic police has few street-life photos of Bengaluru**, so it mixes Bengaluru police stations and cars with Kolkata policemen. The list is pending the user's review of `design/photo-shortlist.html`. Data: `web/data/scene-photos.json`; credits: `design/image-credits.md`.

About 10 approved photos per scene, at least 6. Each is a reference to a photo on Openverse or Wikimedia Commons, with licence, author and source link, not a copy in the repo. Photos are found by a dev-only script, shortlisted into `design/photo-shortlist.html`, and enter the pool only after the user approves them.

What makes a photo "interesting, not just a monument" (the selection criteria):

| Scene | Look for | Avoid |
|---|---|---|
| `auto` | Painted or decorated autos, an auto at dusk or in rain, drivers and lanes seen from a distance, sticker slogans | Plain parked autos in a lot, close-ups of identifiable faces |
| `traffic-police` | A policeman at a junction, in rain, on a podium, with a whistle, wide street context | Close portraits, anything that looks like an official press photo with unclear rights |
| `traffic-jam` | Dense traffic at Silk Board, ORR or a flyover, golden-hour jams, two-wheeler seas | Generic motorway shots with no Bengaluru feel |
| `weather` | Monsoon streets, dark clouds over the skyline, wet MG Road or Church Street, Cubbon Park mist | Stock-style sky photos with no place |
| `signal` | A Sarjapur Road signal if one exists; otherwise other named Bengaluru signals and busy junctions, labelled truthfully | Photos with a wrong or guessed place name |
| `landmarks` | A mix: palace, Lalbagh glasshouse, Cubbon Park, St Mark's, KR Market, Namma Metro, murals; at most 2 of one monument | Repeated postcard shots of Vidhana Soudha |
| `tech-park` | Glass campuses at dusk, Electronic City or Manyata, lanyards and chai stalls outside offices | Interior corporate stock |
| `pov-cup` | A cafe window with the street beyond, a table by the glass, rain on a window, a steel tumbler on a table; our drawn hand and tumbler go in front | Photos of identifiable customers |

All pools also need: landscape, at least 1600 px wide, sharp, no watermark, licence CC0, public domain, CC BY or CC BY-SA, no near-duplicates, at most 2 per photographer per scene. A caption names a place only if the photo's own source text does.

If a scene cannot reach 6 good photos, the shortfall is reported to the user and the pool stays smaller. No unlicensed photo fills a gap.

## 5. Fallback and loader

- While the photo loads, show the doodle loader (an auto-rickshaw driving along a wavy road with a steaming tumbler).
- If the photo fails to load, is blocked or takes more than 6 s, show the drawn fallback scene for that scene id (our own SVG). The person sees no error message.
- The credit line (author, licence, source, with links) appears under a loaded photo and is hidden for the fallback scene.
- A caption uses the playful text in section 1 unless the photo's source text names a place.
