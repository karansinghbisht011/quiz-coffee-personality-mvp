# Bengaluru Coffee Quiz: Requirements

Status: approved in lesson 4.2 and updated since. The data work (sections 3, 4 and 9, phases 1 to 8) is done as of 2026-10-06; the quiz v1 is built (lesson 4.3) and iteration round 1 is under way (section 9, phase 10): mobile web, a sharper result page, a licensed Bengaluru image collection and a full test suite (decisions of 2026-10-06, sections 7, 7a, 7b and 10). Items marked **TBD** are still open.

## 0. Build brief for lesson 4.3 (read this first)

Lesson 4.3 stays exactly as the course script has it (plan mode, build, localhost, screenshot iterations). Only these things differ:

- **Folder.** The lesson's "quiz-project folder" is the empty `web/` folder inside this project folder (`quiz-coffee-personality-mvp`). Run the lesson's `create-next-app` command from `web/`. Do not create a folder called `quiz-project`. (`create-next-app` needs an empty folder, and this project folder holds data, specs and docs.)
- **Data.** `data/quiz_data.json` (227 cafes, 3,286 coffees, 640 KB) is ready. Copy it into `web/public/` and load it in the browser. Regenerate it with `python3 data/export_for_app.py` if the database ever changes. Do not re-run any data step, crawl or web search during the build, and do not edit the data files. **Exception (user decision, 2026-10-06, phase 10.1c):** a cafe-level tag pass may add crowd, vibe and pub or brewery tags for cafes that lack them, because the coverage test showed the gaps cause most of the concentration of results (`IMPLEMENTATION.md` section 4). It would have changed only `data/cafe_tags.csv` and `data/cafe_evidence.csv` (with a backup). **Not used:** the pass was skipped (phase 10.1c), so the data files are unchanged.
- **Questions and points.** Section 5: nine questions, four answers each. The first tag in an answer's bracket gets 2 points and the others 1.
- **Scoring and results.** Section 6 and `specs/scoring-spec.md`: coffee tags x2, cafe tags x1, top 3 coffees from 3 different cafes, ties broken by lower `popularity_rank` (a cafe with no rank counts as worst), one reason line per result, one footnote. Write the scoring as a plain function so it can be checked with the worked examples in the spec.
- **Look.** Match `reference/bengaluru_coffee_personality_quiz.html` (colours, fonts, buttons, hover and select behaviour). Differences: three ranked result cards instead of one, nine questions instead of five, emoji icons on answers, no price anywhere. Photos: see section 7 (the earlier "no photos" rule was replaced on 2026-10-06 by a curated pool of openly licensed Openverse and Wikimedia Commons photos, with credits). The caricature result-page illustration: a simple version is built in 4.3 (user decision, 2026-10-06: big-head guy, girl or both at random, holding a steel tumbler, with rain and a flyover, as inline SVG in `web/components/ResultArt.tsx`). The detailed caricature set (personality-specific scenes) comes in the next sub-module. The landing page also gets a small Bengaluru illustration (tumbler, rain, auto, Kannada sticker) and accent tokens from `design/bengaluru-design-inspiration.md`.
- **One repo for the whole MVP.** `git init` was already run at this project folder's root (branch `main`, no commits), so `create-next-app` in `web/` will not make a nested repo, and the lesson's 4.4 step "initialise git if not already done" is a no-op. `.gitignore` keeps the Python environment, `archive/` and `data/universe.csv` local; about 36 files (2.4 MB) go to GitHub. Git identity is set globally to `karansinghbisht011` and its Gmail.

### Course path from here (what is the same, what differs)

| Lesson | Runs as written, except |
|---|---|
| 4.3 Build & Iterate | Build in `web/` (see above). Copy `data/quiz_data.json` into `web/public/`. |
| 4.4 GitHub | Run from this project's root, not `web/`. `gh` is already installed and logged in as `karansinghbisht011`, so skip the install and login steps and say so. Create the repo as **public** (`gh repo create bengaluru-coffee-quiz --public --source=. --push`); the lesson's `--private` is the one flag that changes. This was the user's decision on 2026-10-06, made after being told about the platforms' scraping terms, with full attribution and method declarations in README section 7. The lesson names it `quiz-project`; use `bengaluru-coffee-quiz` instead (the user's call, and it avoids the name the lesson warns about). `git add .` respects `.gitignore`. |
| 4.5 Go Live | The Vercel CLI is not installed; the script installs it (`npm i -g vercel`). Vercel must build `web/`, not the repo root: link the project from the repo root with the name `bengaluru-coffee-quiz` (check the CLI's current flags), set the project's **Root Directory to `web`** in its settings (open the page for the user), then run `vercel --prod --yes`. Check that the GitHub repo is connected so a push auto-deploys; connect it if not. Without this, the lesson's "push and it auto-updates" promise breaks. |
| After 4.5 | Finish `README.md` (live URL, screenshot, how to run the app). The result-page illustration is the next sub-module. |

The repo is **public** by the user's decision (2026-10-06). The README's section 7 carries the attributions and methods; keep it accurate, and keep contact details out of the files.

## 1. Overview

A personality quiz that recommends specific coffees from real Bengaluru cafe menus. The result is the top 3 matches in priority order, each with a reason.

- Audience (default): coffee lovers in and around Bengaluru, including visitors.
- Success (default): a person gets 3 recommendations they would actually go and try, and each reason makes sense to them.

## 2. Scope

In scope:
- Cafes, restaurants, pubs and breweries within 100 km of the centre of Bengaluru, that are popular on Zomato and Swiggy, judged by popularity rank and rating (see section 3). This replaces the earlier "1,000 Google reviews", "300 reviews" and "500 average reviews" rules (user decision, 2026-10-06), so that well-known places and lesser-known cafes worth trying both make the list. Only cafes, coffee places, popular restaurants and breweries are looked up. A restaurant, pub or brewery stays in only if it has a coffee section.
- Coffee items only. This includes coffee sections labelled "Brews", "Coffee" or "Hot beverages", including those on pub and brewery menus.
- Franchises (for example Third Wave, Cafe Coffee Day): the `maps_link` value is `Any`, because the menu is the same everywhere. Each franchise is listed once. The app turns `Any` into a Google Maps search link for all that franchise's outlets in Bengaluru (decided 2026-10-06: a dead "Every outlet" label gave users nothing to act on).
- Standalone and boutique cafes (for example Dyu Art Cafe, Hole in the Wall, Athiya and Appa): each gets its own Maps link.

Out of scope (default):
- Non-coffee drinks, food, ordering or delivery, and live price updates.
- Paid APIs, including the Google Places API.

Centre of Bengaluru (default): MG Road / Vidhana Soudha area, 12.9716 N, 77.5946 E. This is fixed so the 100 km radius is exact.

## 3. Data pipeline

- Crawler (default, free): Crawl4AI, run locally. No paid service.
- Universe (free sources, combined and deduplicated by name similarity and a distance of about 50 m):
  - OpenStreetMap via the Overpass API (also gives `brand` tags for spotting franchises).
  - Overture Maps Places.
  - Foursquare OS Places: not available as of 2026-10-06. The open S3 bucket now holds only licence files, and the Hugging Face copy is gated (login needed) and dated December 2024. Skipped.
  - Editorial lists (Time Out, LBB, Condé Nast Traveller, Eater, specialty-coffee posts, r/bangalore and r/IndiaCoffee).
  - Franchise store locators (Third Wave, Starbucks, Blue Tokai, Chai Point, Araku, CCD and others).
- Popularity filter (replaces the review-count filter): harvest Zomato and Swiggy listing pages (cuisine and neighbourhood listings), recording each restaurant's page position, rating, cuisines and promoted flag. Promoted (ad) entries are ignored for ranking. A place is kept when it appears in the scrolled popular results of a cafe, coffee, brewery or neighbourhood listing, has a rating of about 4.0 or higher, and carries a coffee or cafe cuisine tag. Confirmed 2026-10-06: the Zomato listing default sort is popularity (the page data marks `popularity_desc` as applied and default); Swiggy order is not confirmed. Review counts are optional and fetched only to check borderline cases. `popularity_source` records the listing and rank used.
- Scraper services (Outscraper, Apify, SerpApi): not used for discovery. They may be used only to gather review counts or Maps links when the free sources fail.
- Maps links for standalone cafes: found by web-search sub-agents, then recorded in the CSV.
- Menus: crawled by parallel sub-agents, one per cafe or franchise.
- Gaps: a cafe with no usable online menu is flagged and excluded. Nothing is guessed.
- The dataset carries a `last_verified` date per row.
- Respect rate limits. Google Maps pages are not used (a single test fetch returned an empty page). Cafe descriptions and review excerpts come from ordinary web search results. Zomato and Swiggy terms restrict scraping, so we crawl slowly and only for public review counts (recorded as a risk in section 8).

## 3a. Master CSV schema

One row per coffee per cafe. A franchise appears once.

| Column | Notes |
|---|---|
| sno | Row number |
| cafe | Cafe or franchise name |
| maps_link | Maps URL for standalone cafes. `Any` for franchises. |
| coffee_item | Coffee name as on the menu |
| type | `franchise` or `standalone` |
| source_url | Where the menu item was found |
| popularity_rank | Best non-promoted page position on a listing |
| rating | Zomato or Swiggy rating |
| popularity_source | Listing and platform the rank came from |
| review_count | Optional, only where fetched to check a borderline case |
| last_verified | Date |
| cafe_specialty, cafe_experimental | Cafe-level facts (yes, no or unknown) used only for the Bold rule. Evidence, About text and any rating live in `data/cafe_evidence.csv`, not in this file. |
| tag columns | One value column per tag dimension (`strength`, `sweetness`, `milk`, `temperature`, `flavour`, `adventurousness`, `vibe`, `setting`, `crowd`) plus a `<dimension>_basis` column (`stated` or `inferred`). Rules are in `specs/tagging-rubric.md`. |

## 4. Tagging

Tags are inferred from menu text, cafe descriptions and Instagram pages, and are marked as inferred.

- Coffee tags (fixed vocabulary): strength (mild, medium, strong), sweetness (none, light, sweet, dessert), milk (black, milk, plant milk), temperature (hot, iced), flavour (nutty, chocolate, caramel, fruity, spiced, classic), adventurousness (familiar, curious, bold).
- Bold rule (user decision, 2026-10-06): a coffee becomes `bold` (basis inferred) when it has a twist (flavour spiced, fruity or nutty, or a tonic, juice, infusion, coconut, jaggery or similar cue) and its cafe is a specialty or experimental one (`cafe_specialty` or `cafe_experimental` is yes). Plain strong drinks do not qualify. A drink never drops below its earlier value.
- Cafe tags: vibe (cozy, social, work-friendly, aesthetic, quick stop), setting (chain, pub or brewery), crowd (quiet, lively). The `boutique` setting was dropped on 2026-10-06 (user decision): it sat on 196 of 227 cafes and separated nothing, so a standalone cafe now has a blank setting.

## 5. Quiz design

- Question vibe: a mix of everything, 3 questions from each style.
- Number of questions: 9.
- Answer types (default): single choice. Multi-select and sliders can come later.
- Each answer adds points to one or more tags from section 4. Tags are shown in brackets. The first tag in a bracket gets 2 points and every other tag gets 1 (approved 2026-10-06). The full scoring rules are in `specs/scoring-spec.md`.
- No budget question. Price is not part of this project at all (user decision, 2026-10-06): it is not collected for the final database, not scored and not shown.

Pop culture
1. Which Netflix night are you?
   - A gripping thriller [strong, bold]
   - A cozy comfort rewatch [milk, sweet, familiar, chain]
   - A wild new foreign series [curious, fruity]
   - Reality TV with friends [lively, social]
2. Pick your Hogwarts house.
   - Gryffindor [bold, strong]
   - Hufflepuff [cozy, sweet, milk]
   - Ravenclaw [curious, black]
   - Slytherin [strong, caramel, aesthetic]
3. Your movie genre?
   - Action [strong, bold]
   - Rom-com [sweet, cozy]
   - Indie or arthouse [curious]
   - Comedy [lively, familiar, medium]

Lifestyle
4. Your ideal Saturday morning?
   - A long walk and breakfast [cozy, familiar, quiet]
   - Working on a side project [work-friendly, strong]
   - Brunch with friends [social, sweet, lively]
   - Wandering into somewhere new [curious]
5. How do you like your coffee in Bengaluru weather?
   - Piping hot [hot, classic]
   - Iced, always [iced]
   - A quick one on the go [medium, quick stop]
   - Surprise me [curious]
6. Which Bengaluru moment is most you?
   - Rain at 5 pm [cozy, sweet, hot]
   - A traffic jam on ORR [strong, bold]
   - Sunday in Cubbon Park [quiet, mild]
   - Friday night in Indiranagar [lively, social, pub or brewery]

Abstract and quirky
7. Pick a colour.
   - Deep black [black, strong, none]
   - Warm caramel [caramel, sweet]
   - Forest green [plant milk, quiet, nutty]
   - Sunset orange [fruity, bold]
8. Desert island, one item.
   - A hammock [cozy, mild, light]
   - A guitar [lively, spiced, chocolate]
   - A library [quiet, black]
   - A speedboat [bold, strong]
9. A friend describes you as...
   - "Always on" [strong, work-friendly]
   - "Sweet" [sweet, milk]
   - "Mysterious" [curious, black]
   - "The life of the party" [lively, social, dessert]

## 6. Matching and results

- Score each coffee by weighted tag match against the person's answers: a matched coffee tag counts its points x 2, and a matched cafe tag counts its points x 1, half the weight (approved 2026-10-06). Details, including missing tags and the reason line, are in `specs/scoring-spec.md`.
- The result is 3 matches from 3 different cafes, in priority order. **Changed 2026-10-06 (scoring v2, user decision):** they are no longer simply the three highest scores. Reason: the exhaustive coverage test showed that under the original rule only 17.5% of the 3,286 coffees and 56% of the 227 cafes could ever be recommended, and one cafe appeared in 32% of all possible quizzes (the coverage blocker, `IMPLEMENTATION.md` section 4). v2 keeps matches close to the best score but spreads them:
  - Tags are weighted by rarity (a rare match counts more than a common one), the cafe bonus is capped and normalised (a cafe with three vibe tags gets no more than one matched tag's worth per dimension), and a cafe with missing data is treated neutrally instead of earning nothing.
  - A small popularity prior favours well-known cafes slightly (the user's "slight skew").
  - The three results have roles: **Best match**, **Close match** and **Wildcard** (a lesser-known cafe). Each is drawn at random, with a seeded generator, from cafes within a stated band of the best score, so each is still a good match.
  - Exact ties are broken by a seeded hash, not by `popularity_rank` (this replaces the earlier tie-break rule).
  - A **"Show different picks"** button re-draws the results for the same answers. The same answers on different visits can give different picks.
  - Exact formulas and parameters: `specs/scoring-spec.md` "Scoring v2". Coverage targets: section 10.
- Each result card shows: coffee, cafe, the Maps button (always shown: a pin link for standalone cafes, an "All outlets" search link for franchises), and a short reason that names the matching tags.
- The result page shows a Bengaluru scene chosen from the person's answers (section 7b): a curated Bengaluru photo of the scene (section 7), with a caricature (a guy, a girl or both, picked at random) holding a coffee drawn on top. Layout and first-fold targets are in section 7b. Photos of the cafes themselves (the earlier idea of 3 Google Images photos per place) stay dropped for terms-of-service and copyright reasons; scene photos come only from the curated Openverse and Wikimedia Commons pool, with credit (section 7).

## 7. Look and feel

- Visual style: match the reference page `reference/bengaluru_coffee_personality_quiz.html` ("Namma Coffee Personality Test"). It replaces the style-preview step. Keep it close to the reference in:
  - Colour theme: warm paper and cream backgrounds, coffee-brown primary, leaf-green accents, yellow and rose highlights (the `:root` tokens in the reference).
  - Type: Fraunces for headings, DM Sans for body.
  - Elements: rounded cards, pill chips, a yellow tilted sticker, a dashed "why" box, a landing hero with a start button, a progress bar with a question counter.
  - Buttons and interactions: brown primary button with a hard bottom shadow, outlined secondary button, a pill-shaped Maps button with a pin-on-map icon, option cards that lift on hover and get a brown border when selected, Back and Next flow, a fade-and-rise animation on the result.
  - Layout: responsive, single column on phones.
  - Differences from the reference: it shows 3 ranked results (not 1) with a reason each, and 8 to 10 questions (not 5).
- Images (changed 2026-10-06, user decision; this replaces the earlier "no real photos" rule). Photos of the cafes themselves stay out (terms of service and copyright). **Current rule: the result page shows a hand-picked Bengaluru photo from a curated pool, taken from Openverse and Wikimedia Commons**, as the scene backdrop, with our own drawn caricature on top. The user wants specific, interesting pictures, not random search results and not just monuments. Rules:
  - **Photos are references, not files.** `web/data/scene-photos.json` lists each approved photo (source page, direct image URL, author, licence, alt text). The browser loads it straight from the source's servers (for example Wikimedia's). No third-party image files are stored in the repo. No API key, no secret and no server route are needed.
  - **Licences:** only CC0, public domain, CC BY and CC BY-SA. Never NC, ND, all rights reserved, Google Images results, press photos, paid stock, Pinterest or social media. If a licence is unclear, the photo is dropped.
  - **Selection criteria:** prefer photos with a story or street life over postcard monuments (a painted auto at dusk, a policeman in monsoon rain, a tangle at a signal, a flyover at golden hour, murals, Namma Metro against gulmohar blooms, filter-coffee tumblers, cafe windows, tech-park glass in the evening, market stalls, rain on MG Road). Landmarks are allowed but at most 2 photos of one monument per pool, mixing landmark types. Landscape, at least 1600 px wide, sharp, no watermark. No near-duplicates and at most 2 per photographer per scene. Prefer wide shots; no close-ups of identifiable private people; no readable brand logo as the focus. A place is named in a caption only if the source's own title or description states it.
  - **Pool size:** about 10 photos per scene, at least 6; a shortfall is reported, not filled with weak or unlicensed photos.
  - **Approval gate:** candidates are found with a dev-only script, shortlisted by Claude into `design/photo-shortlist.html` (a contact sheet), and only photos the user approves go into `scene-photos.json`.
  - **Credit:** each photo shows "Photo: <author>, <licence>, via <source>" with links to the author or source page and the licence; `design/image-credits.md` lists all of them. Photos get a light colour adjustment in CSS only; the credit says so where the licence asks for it.
  - **Delivery:** the photo is chosen when the scene is known (after the last answer) and prefetched while the person clicks Reveal. The result text never waits for the photo. A fixed aspect-ratio frame prevents the page jumping, and image URLs are sized for the screen.
  - **Loader and fallback:** while the photo loads, a doodle loader (an auto-rickshaw driving along a wavy road with a steaming tumbler) is shown. If the photo fails, is blocked or takes more than 6 s, a drawn fallback scene (our own SVG) appears, with no error shown to the person.
  - Known limit: a photo can contain recognisable people; wide shots are preferred but each cannot be guaranteed.
  - The research on how to draw good caricatures is recorded in `design/caricature-research.md`, and on the photo sources' terms in `design/photo-sources-notes.md`.
- Icons: emoji on answer options, as in the reference.

## 7a. Mobile web compatibility (user decision, 2026-10-06)

**Desktop web comes first**, as in the original build: the desktop layout is the primary design and must not regress. **Mobile web must be compatible**: the quiz has to work and look good in a phone or tablet browser, because many visitors will arrive from a link on a phone. The responsive layer is built on top of the desktop layout (desktop styles are the base, `max-width` adaptations adjust it). The desktop first-fold rules in section 7b are checked first; the compatibility rules below are required before sign-off.

- Test devices: 360x640, 375x667, 390x844, 412x915 (phones), 667x375 (landscape phone), 768x1024 (tablet), 1280x720 and 1440x900 (desktop).
- No horizontal scroll at any width.
- Tap targets are at least 44x44 px. Body text is at least 16 px; secondary text is at least 12 px.
- Use `100dvh` (not `100vh`), safe-area insets for notched phones, and `touch-action: manipulation`. Hover effects apply only where hover exists (`@media (hover: hover)`) so a tap does not leave a stuck hover state. Visible keyboard focus. Reduced-motion preference respected.
- Quiz screen on phones (up to 767 px; desktop keeps the inline Back and Next buttons): one column, compact option cards, progress at the top, and a sticky bottom bar with Back and Next within thumb reach.
- Landing on a 360x640 phone: the headline and the start button are visible without scrolling; the info tiles become a single scrollable strip; the art is a short banner.
- Result on a 360x640 phone: scene banner of about 28% of the screen height, then the first result card's coffee and cafe names are visible without scrolling; "Take it again" is reachable from the sticky bar.
- The Kannada city stamp hides below 380 px width.
- The scene photo loads from the source's servers at a phone-sized width (about 960 px) inside a fixed aspect-ratio frame so the page does not jump; the result text appears first.

## 7b. Result page layout and scenes (user decisions, 2026-10-06)

- Type hierarchy: the cafe name is the more prominent line (18 px, bold, with a pin); the coffee name is smaller than before (about 19 to 24 px). Both clamp to two lines. Long cafe names such as "Frozen Bottle - Milkshakes, Desserts And Ice Cream" are shown as a bold name with the part after " - " as a small subtitle. This is display-only; the data is not edited.
- Desktop (1024 px and wider): two columns. Left (sticky): the scene image, scene title and one-line caption, a small heading and "Take it again". Right: the three result cards, compact. All three cards are fully visible without scrolling at 1280x720 and 1440x900.
- Tablet (768 px): scene banner and the first card visible without scrolling. Phone: see section 7a.
- Scenes (eight): autorickshaw, traffic police, traffic jam, weather and clouds, a Bengaluru signal (a Sarjapur Road photo if an openly licensed one exists, otherwise other named Bengaluru signals, labelled truthfully), popular landmarks, tech park, and a point-of-view from inside a cafe holding a coffee. The scene is chosen from the person's answers; the photo within the scene (a random pick from the curated pool, section 7) and the character (guy, girl or both) are random. A caption names a real place only if the photo's own source text does. The rules are in `specs/scene-spec.md`.
- Randomness is injectable (a seeded random source in tests, `Math.random` in the browser), so it can be tested.

## 8. Risks

- Scraping terms of service and bot blocking.
- Menus go stale. Mitigation: the `last_verified` date.
- Inferred tags may be wrong. Mitigation: they are marked as inferred.
- Zomato and Swiggy terms restrict scraping, and these sites use bot protection. Mitigation: slow crawling, and flag any place where a count can't be found.
- Rank depends on each site's default sort order, which may change, and ads can distort it. Mitigation: promoted entries are ignored and the sort order is checked on the live page.
- Crawl time and local compute limits.
- Photo links break: a source file can be renamed or deleted. Mitigation: drawn fallback scene, 6 s timeout, an optional link-check script, and stable Commons file names.
- Interesting-ness is subjective. Mitigation: the user approves every photo from a contact sheet; a thin pool is reported, not padded.
- Licences: CC BY and CC BY-SA need credit; unclear licences are dropped; photos stay as links, not copies. A test checks every entry's licence, host and fields.
- Privacy: recognisable people may appear in street photos. Mitigation: wide shots preferred; flagged as a known limit.
- Sarjapur signal may have few photos. Mitigation: honest broader signals, labelled as what they are.
- Page weight on mobile data. Mitigation: width-limited image URLs, a fixed frame, text first, and a size check in the browser tests.

## 9. Phases and success criteria

1. Spec: this document. A separate Implementation doc is skipped for now, following the course flow (user decision, 2026-10-06).
2. Crawl setup check: DONE (2026-10-06). Crawl4AI installed, test crawls worked.
3. Build the universe: DONE 2026-10-06. `data/universe.csv` has 24,750 rows: OpenStreetMap and Overture data for the 100 km circle, chain names cleaned, and 270 entries from four editorial sweeps (46 of them new places after merging 12 duplicates). Athira and Appa Coffee were not found by any source and are dropped (user decision, 2026-10-06).
4. Popularity shortlist: DONE 2026-10-06 (rating bar of 4.0 and above chosen by the user). The Zomato and Swiggy harvest (`crawl/harvest.py`) collected 3,317 rated places; `data/build_cut.py` keeps those rated 4.0 or higher with a cafe, coffee or brewery tag, ranked by position on cafe, coffee, tea, bakery and brewery listings. Result: `data/popular_shortlist.csv`, 381 places (358 standalone, 23 chains; 181 matched to the universe). Unrated places and Swiggy-only gaps are excluded. Neighbourhood pages in some outer towns (Hosur, Nelamangala, Devanahalli, Doddaballapur) returned nothing on Zomato, so coverage outside the city is thin.
5. Maps links: DONE 2026-10-06. Generated as Google Maps search links from name and area (google.com/maps/search/?api=1&query=...), not place pins, so a few ambiguous names could open the wrong place. Franchises get `Any`. Stored in `data/popular_shortlist.csv`.
6. Menu crawl: DONE 2026-10-06 (two passes). Pass 1: 13 sub-agents read Zomato `/order` pages. Pass 2: 6 sub-agents tried own sites, Swiggy, EazyDiner and district.in, reading image and PDF menus (PyMuPDF plus vision). Merged by `data/merge_menus.py` into `data/menus_master.csv`: 3,300 coffee rows from 228 cafes and chains (206 standalone, 22 franchises). Of 357 distinct shortlist cafes, 228 have coffee rows, 91 show no coffee and 38 still have no readable menu (dropped). Where one cafe appeared in several batches, the largest menu was kept (13 cases). Price was collected in the raw files but is dropped from the final database (user decision, 2026-10-06); 973 rows have no description. Pass 2 hit a 200-call web search limit per agent, so some cafes were not fully tried.
7. Tagging: DONE 2026-10-06 (`data/merge_tags.py`, then `data/merge_vibe.py`). 8 sub-agents tagged the 3,300 coffee rows by `specs/tagging-rubric.md`. A second web pass (12 agents, then 2 serial re-runs after rate-limit failures) researched cafe vibes: vibe tags on 216 of 227 cafes (95%) after a generic-search gap fill for chains and low-profile cafes, crowd on 68, specialty yes 44, experimental yes 34, with menu-derived facts filling gaps. Final database: `data/coffee_database.csv` (3,286 rows, 227 cafes), `data/cafe_tags.csv`, evidence in `data/cafe_evidence.csv`. Bold rule applied: 176 to 469 bold (14%). Known thin spots: crowd is blank for 159 cafes, the `boutique` tag was dropped, so setting is filled only for chains (24) and pub or brewery (4), 11 cafes still have no vibe (no venue-specific source found). The user reviewed the sample on 2026-10-06 and found it good. The user reviews `data/tagging/review_sample.md` before the build. The agents' working files (batches, per-batch outputs, tagging scripts, pre-tag coffee list) are archived in `archive/pipeline-intermediates.zip`; the loose copies were deleted on 2026-10-06 at the user's request.
8. Design inspiration: research Bengaluru design inspiration (illustration styles, motifs, colours, typography, local signage and packaging) and write a short shortlist of design elements into a notes file. No real photos are downloaded. Needs the user's go-ahead before it runs.
9. Quiz build (lesson 4.3): against the full CSV. No sample-only build (user decision, 2026-10-06). v1 DONE 2026-10-06 (`web/`, scoring checked against the spec).
10. Iteration round 1 (lesson 4.3), user decisions of 2026-10-06, in sub-phases that each get sign-off:
    - 10.0 Docs (this file, `specs/scoring-spec.md`, `specs/scene-spec.md`, README, and the new `IMPLEMENTATION.md`), corrected for the curated Openverse and Commons photo set and for scoring v2 on 2026-10-06. DONE.
    - 10.1 Test harness (Vitest, Playwright, axe) and baseline tests on the existing logic and data. DONE; it found the coverage blocker.
    - 10.1b Scoring v2: a lab comparing variants, the new engine, the brewing (loading) screen, and a coverage retest against the targets in section 10. **DONE 2026-10-06** (results: `IMPLEMENTATION.md` section 4.6). Sign-off before 10.2.
    - 10.1c Cafe-data fix (idea 8 of the coverage brainstorm): **piloted, then skipped by user decision (2026-10-06).** Two blind calibration pilots found web research reliable for `quiet` cafes but poor for `lively` ones, and a lab simulation showed that filling crowd tags does not improve the spread under scoring v2 (`IMPLEMENTATION.md` section 4.4b). The data stays as it is; scoring v2's neutral credit for missing cafe data handles the gaps. The crowd and vibe gaps remain a possible later data-quality job.
    - 10.2 Desktop result page layout and type (section 7b), plus mobile web compatibility (section 7a). **DONE 2026-10-06** for everything except the scene photos and caricature (10.3 and 10.4): the result page keeps the earlier drawn illustration as a placeholder in its frame. Measured results: `IMPLEMENTATION.md` section 4.7.
    - 10.3 Caricature and photo-source research (`design/`), photo discovery, the contact sheet for the user's approval, `web/data/scene-photos.json` and the doodle loader (section 7). **Built 2026-10-06**; the 66-photo shortlist awaits the user's review (`design/photo-shortlist.html`).
    - 10.4 Scene selection, redrawn caricature, fallback scenes, photo credit, randomness. **Built 2026-10-06** (`IMPLEMENTATION.md` section 7).
    - 10.5 Full coverage run, fixes and sign-off.

Each step that makes network calls needs the user's go-ahead first.

Success:
- The CSV follows the schema with no missing required columns.
- Every cafe in the CSV has a documented review-count source.
- Every quiz result returns 3 matches with a reason.
- A person can complete the quiz and get a result without errors.


## 10. Testing (user decision, 2026-10-06)

The whole project is tested, including randomness and real coverage of the database. Everything runs with `npm run test:all` in `web/`. Unreachable or odd data is reported to the user, never silently fixed or tuned away.

Unit and data tests (Vitest):
- Data integrity: record counts, unique ids, every coffee has a cafe, tag values inside the vocabulary, no price field, Maps link is a URL or `Any`, the `hot|iced` values, null cases, cafes with fewer than 3 eligible coffees.
- Questions: nine questions of four answers, every quiz word mapped and present in the database, matches section 5.
- Scoring: weights, first-tag bonus, ties, missing popularity rank, eligibility floor and its relaxation, three different cafes, reason templates, determinism, fixtures that are frozen (not read from live data).
- Exhaustive coverage: all 262,144 answer combinations are reduced to distinct profiles and run through the recommender. Each must return 3 results from 3 different cafes with a valid reason. A coverage report (saved to `web/test-results/coverage.md`) shows how many of the 3,286 coffees and 227 cafes can ever be recommended, which are never reachable, which tag values never match, and how often each scene is chosen. Pass thresholds were agreed after the first honest run (v1: 574 coffees, 128 cafes, top cafe in 31.8% of quizzes). **Targets for scoring v2 (proposals, confirmed or changed after the lab with the user):** at least 90% of cafes that have an eligible coffee can appear; at least 45% of eligible coffees can appear; no cafe in more than about 18% to 20% of all quizzes (the first proposal of 8% was shown by the lab to be out of reach without lowering match quality; measured on all 262,144 quizzes: 19.3%, `IMPLEMENTATION.md` section 4.6); the 10 most common cafes take at most 35% of all picks; the Best match scores on average at least 0.97 of the best possible score (never below 0.90), the Close match at least 0.92 and the Wildcard at least 0.85 (never below 0.75); every result still has 3 different cafes and a valid reason; one recommendation takes under 50 ms at the 95th percentile. Randomness is tested with fixed seeds: the same seed gives the same picks, different seeds differ, every candidate inside a band is picked at least once over many rolls. The loading ("brewing") screen is tested with an injected delay: it appears after 250 ms of waiting, stays at least 700 ms, never flashes when the work is fast, and works at 360x640 and 1280x720.
- Scenes: every scene is reachable and none dominates; the scene table is complete (title, caption, query terms, fallback).
- Photo set (`web/data/scene-photos.json`): every scene has at least 6 approved photos; unique ids and source URLs; licence in the allow list (CC0, public domain, CC BY, CC BY-SA); required fields and alt text present; image host on the allow list; width at least 1600; at most 2 per photographer per scene; at most 2 per monument in the landmarks pool; `design/image-credits.md` matches the JSON; no photo file is stored in `web/public`.
- Optional link check (`npm run check:photos`, uses the network, run only with the user's go-ahead): every image URL answers with an image.
- Randomness: with a seeded random source every character and every photo of every scene appears; the same seed gives the same output; different seeds differ; the previous photo is never repeated.
- Display helpers keep all text.

How to run (in `web/`): `npm test` (fast unit and data tests), `npm run test:coverage` (the exhaustive run, about 2 minutes), `npm run test:e2e` (browser tests), `npm run test:all` (everything plus lint and type check).

Browser tests (Playwright, with axe for accessibility). They run on the Google Chrome installed on the Mac (Playwright's own browser download times out on this network), with phone sizes emulated by viewport, touch and user agent. **WebKit (Safari's engine) is therefore not tested**; iPhone Safari behaviour is covered only by emulation and should be checked by hand on a real iPhone:
- Full flow on every test device in section 7a: Next disabled until an answer, Back keeps answers, retake resets, results show 3 cards from 3 cafes, Maps button on every card: opens the cafe pin, or the all-outlets search for franchises.
- Scene photo flow (photo URLs intercepted and served from local fixture images, so runs are fast and repeatable): the loader appears, then the photo; the cards are visible before the photo; the credit line shows author, licence and working links; a slow image shows the loader and then the fallback scene; a broken image URL shows the fallback; the photo request starts before Reveal; "Take it again" shows a different photo.
- Layout: no horizontal overflow, tap targets of at least 44 px, the first-fold rules of sections 7a and 7b, type hierarchy, long-name clamping.
- Failure states: the data file blocked or slow, a photo that fails to load.
- Accessibility: contrast, alt text, labels, keyboard-only run, reduced motion.
- No console errors or failed requests. Screenshots per device go in `web/test-results/` (git-ignored) for review.
