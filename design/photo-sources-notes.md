# Photo sources: Openverse and Wikimedia Commons (hotlinking with credit lines)

Researched 2026-10-06. "Verified" = confirmed on an official page or by a live read-only request to the official API on that date. "Unverified" = not confirmed on an official page. This is research, not legal advice.

## 1. Openverse API

| Fact | Status | Source |
|---|---|---|
| Base URL `https://api.openverse.org/v1/` | Verified | https://api.openverse.org/v1/ |
| Image search: `GET /v1/images/?q=...` (q max 200 chars) | Verified | https://api.openverse.org/v1/schema/?format=json |
| `license` = comma list: by, by-nc, by-nc-nd, by-nc-sa, by-nd, by-sa, cc0, nc-sampling+, pdm, sampling+. For us: `license=cc0,pdm,by,by-sa` | Verified | schema URL above |
| `license_type` = all, all-cc, commercial, modification (alternative filter; `commercial` is useful) | Verified | schema URL above |
| `aspect_ratio` = square, tall, wide | Verified | schema URL above |
| `size` = large, medium, small | Verified | schema URL above |
| `category` = digitized_artwork, illustration, photograph (use `category=photograph`) | Verified | schema URL above |
| Other useful: `source`, `excluded_source`, `extension` (e.g. jpg), `filter_dead=true`, `mature`, `page`, `page_size` | Verified | schema URL above |
| `page_size` max for anonymous = 20 (live: 20 OK, 21 returned `page_size may not exceed 20 for anonymous requests`). Registered users may request larger pages; the exact number is not stated in the docs I could read | Verified for anonymous; registered max unverified | live call to /v1/images/; auth text in schema URL |
| Pagination depth per query is limited for all users (anonymous query returned result_count 240, page_count 12 at page_size 20) | Partly verified | schema "auth" tag text; live call |
| Response fields exist: title, creator, creator_url, license, license_version, license_url, url, foreign_landing_url, thumbnail, width, height, source, provider, category, filetype, filesize, attribution, tags, mature, detail_url | Verified (schema Image properties) | schema URL above |
| `attribution` is a ready-made string, e.g. `"Title" by Creator is licensed under CC BY 2.0. To view a copy of this license, visit https://creativecommons.org/licenses/by/2.0/.` | Verified (live sample) | live call |
| `creator` can be null (rawpixel CC0 sample) | Verified (live sample) | https://api.openverse.org/v1/images/ |
| `thumbnail` is an Openverse proxy URL of form `https://api.openverse.org/v1/images/<id>/thumb/`; `url` is the original on the provider's server (e.g. Flickr static) | Verified (live sample) | live call |

**Rate limits.**
- Anonymous, observed in response headers on 2026-10-06: `x-ratelimit-limit-anon_burst: 20/min` and `x-ratelimit-limit-anon_sustained: 200/day`. Verified by live headers, not stated as numbers in the docs I read.
- Registered: "Registered users are automatically granted slightly higher limits" (no numbers in docs). Verified text; numbers unverified. A web search summary claimed 10,000/day and 100/min for registered and 100/day, 5/hour for anonymous; the anonymous figures contradict the live headers, so treat all of those as unverified.
- Exceeding limits returns HTTP 429. Responses carry rate-limit headers. Source: https://api.openverse.org/v1/schema/?format=json (auth tag text).
- Tiers in the code docs: Standard (anyone who authenticates), Enhanced (granted selectively), Exempt (internal). Source: https://docs.openverse.org/api/reference/authentication_and_throttling.html
- Higher limits on request, case by case (contact route in the auth text; see https://github.com/WordPress/openverse#keep-in-touch).
- openverse.org itself uses anonymous browser requests. Source: schema auth text.

**How to register (free).** The API is free for anonymous and registered users. Sign up with `POST /v1/auth_tokens/register/` (gives `client_id` and `client_secret`; store them, they cannot be retrieved again; verify your email via the link sent), then get a bearer token with `POST /v1/auth_tokens/token/` and send `Authorization: Bearer <token>`. Verified from schema; the exact token path is the standard `/v1/auth_tokens/token/` and is unverified in this session. Source: https://api.openverse.org/v1/ (section Register and Authenticate) and the schema URL.

**Terms of service.** Must follow rate limits and registration requirements, must give proper attribution to CC-licensed works, must not scrape the catalogue or use multiple machines to bypass limits. Source: https://wordpress.github.io/openverse-api/terms_of_service.html (also https://docs.openverse.org/terms_of_service.html, referenced by the schema, not fetched). Openverse "cannot make any claims about the accuracy of license information": verify each licence. Source: https://docs.openverse.org/api/reference/made_with_ov.html

**Design implication.** Do not call the API from every visitor's browser (20/min and 200/day anonymous per client would be hit by a busy page, and calls from a shared server count against one limit). Fetch once, pick photos by hand, and save each record's fields (url, license, creator, etc.) in our own data JSON. Hotlinking the final image then hits the provider's server (for `url`) or the Openverse thumb proxy (for `thumbnail`), not the search endpoint. Whether the thumb proxy has its own limits is unverified.

## 2. Wikimedia Commons / MediaWiki API

**Search files (verified by live request, 2026-10-06 and documented at https://www.mediawiki.org/wiki/API:Search):**
`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=<terms> filetype:bitmap&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=500&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|Categories|AttributionRequired`
- `srlimit` range 1 to 500 for list=search (documented). For generator=search the prefix is `gsr...`. `filetype:bitmap` search keyword: used in my live call and it worked; keyword documentation unverified.
- `iiprop`: url (file URL and description page URL), size (bytes, width, height), mime, extmetadata (HTML-formatted) are documented at https://www.mediawiki.org/wiki/API:Imageinfo
- `iiurlwidth=N` returns `thumburl`, `thumbwidth`, `thumbheight`. Documented cap: with iiurlwidth, no more than 50 scaled images are returned per request (same page).
- `iiextmetadatafilter` limits extmetadata keys (same page).
- Live response keys seen: extmetadata `LicenseShortName` (e.g. "CC BY-SA 4.0"), `LicenseUrl`, `Artist` (HTML link), `Credit` (HTML), `ImageDescription`, `Categories` (pipe-separated), `AttributionRequired` ("true"). The values are HTML, so strip tags or render carefully (sanitise) before inserting. Source: live call; HTML note on the Imageinfo page.
- `descriptionurl` gives the Commons file page, which we link as the source.

**Thumbnails and hotlinking.**
- Standard thumbnail widths on production: 20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840 px. "Direct requests (hotlinking) will be rejected unless they use a standard size"; requests through PHP are rounded up. A "429 Use thumbnail steps" error means a non-standard width; the stated fix is to use only listed widths or use the imageinfo API for the URL. Source: https://www.mediawiki.org/wiki/Common_thumbnail_sizes
- Live check: `upload.wikimedia.org/.../777px-...` returned HTTP 400 (non-standard width), consistent with the rule. Only a single test, treat as supporting evidence.
- Live check: `Special:FilePath/File.jpg?width=500` returned a 302 to `Special:Redirect/file/...&width=500`, which redirects to the file. The `?width=` parameter on Special:FilePath is therefore accepted, but I could not confirm it in official docs; unverified in docs. Using `iiurlwidth` and the returned `thumburl` is the safer way. Note the returned thumburl in live data used host `thumb.wikimedia.org` with `utm_source=commons.wikimedia.org` tracking query parameters.
- Hotlinking: "Directly using a Commons file via embedding its URL ('hotlinking') is also possible, but is not recommended." Source: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- Wikimedia states rate limiting for requests not assessed as coming from browsers is being broadened; real visitors' browsers hotlinking standard sizes should be fine, but not guaranteed. Source: search summary of the Common thumbnail sizes page (browser-vs-bot wording unverified).

**User-Agent and API etiquette.**
- Scripts must send an informative User-Agent with contact info, format `<client name>/<version> (<contact info>) <library>/<version>`; missing or generic UAs can get HTTP 403. Source: https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
- Unauthenticated Action API: concurrency 1, below 5 requests/second; authenticated up to 3 concurrent, 10 requests/second. Source: https://wikitech.wikimedia.org/wiki/Robot_policy
- A browser cannot reliably set a custom `User-Agent`; do the Commons API lookups in our own script with a proper UA, save results, and let only the image load directly in the browser. (Reasoning, unverified as an official statement.) Wikimedia also supports the `Api-User-Agent` header for browser-side JS (unverified in this session).

## 3. Attribution wording per licence

General rule (Creative Commons TASL): Title, Author, Source (link), License (link to deed). Title is required for CC 3.0 and earlier, optional for 4.0. Credit the real author, not the platform. Do not hide credit only in alt text or metadata. Public-domain credit is recommended, not required. Source: https://wiki.creativecommons.org/wiki/Best_practices_for_attribution

| Licence | Credit line to print under the photo | Notes |
|---|---|---|
| CC0 1.0 | None required. Suggested: `"Title" by Creator, via Openverse/Wikimedia Commons (CC0)` | Courtesy only (CC best practices page, above) |
| Public Domain Mark | None required. Suggested: `"Title" by Creator (Public Domain)` | Same page |
| CC BY 4.0 | `"Title" by Creator (link) is licensed under CC BY 4.0 (link). Source: <foreign_landing_url>. Cropped/resized if changed` | 3(a)(1): creator identification, copyright notice, licence notice, disclaimer notice, link to material where practicable; and indicate modifications. Source: https://creativecommons.org/licenses/by/4.0/legalcode.en |
| CC BY 3.0 | Same, and the title is required "if supplied"; also credit adaptations ("Cropped version of ... by ...") | Section 4(b). Source: https://creativecommons.org/licenses/by/3.0/legalcode |
| CC BY-SA 4.0 | Same as CC BY 4.0, with licence text "CC BY-SA 4.0" | 3(a) attribution; 3(b) if you share Adapted Material, you must license your contribution under the same or a compatible licence. Source: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en |
| CC BY-SA 3.0 | Same, with title; if adapted, state it and apply the same licence | Detailed legal text not fetched: unverified in this session (BY-SA 3.0 legalcode page, https://creativecommons.org/licenses/by-sa/3.0/legalcode, not read) |

Practical shortcut: Openverse returns an `attribution` string already assembled; for Commons, build it from `Artist` (strip HTML), `LicenseShortName`, `LicenseUrl`, and `descriptionurl`. Wikimedia lists the `AttributionRequired` flag per file.

**What counts as adapting.**
- CC BY 4.0 defines Adapted Material as material "translated, altered, arranged, transformed, or otherwise modified" in a way needing copyright permission; "technical modifications necessary" to use the licence in other media and formats do not by themselves create Adapted Material (sections 1 and 2(a)(4)). Source: https://creativecommons.org/licenses/by/4.0/legalcode.en
- Practical reading (not an official statement; unverified): resizing, compression, and a simple crop for layout are technical or minor and best marked with "cropped" or "resized" in the credit; a CSS overlay (a dark gradient or filter applied by the browser) leaves the file unchanged on the server, so it is arguably display styling, but a strong colour filter, drawing our SVG characters over the photo, or merging with other art may be a derivative or collection. For BY-SA content, treat that composite as a possible adaptation: the composite would then need to be shared under BY-SA (the caricatures would be under BY-SA only inside the composite, not our whole site). Safest approach: put a caption stating "Photo: ... (CC BY-SA 4.0). Illustration overlay added." and ask a lawyer if a BY-SA photo is used with the overlay. Never use `by-nd` or non-commercial licences (we filter them out).
- Creative Commons guidance on modified works: note it, e.g. "Cropped from original", and keep full original attribution. Source: https://wiki.creativecommons.org/wiki/Best_practices_for_attribution
- Commons: "If you are creating a substantially new work using the file and the file's license requires you to license derivatives in a certain way, be sure you comply." Source: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia

## 4. People in photos and freedom of panorama (India)

- Identifiable people: Commons says consent rules vary by country; consent for taking, uploading and reusing are separate; personality rights belong to the subject, are separate from copyright, and "can restrict reuse even when images carry free licenses"; commercial use typically needs consent in most jurisdictions. Source: https://commons.wikimedia.org/wiki/Commons:Photographs_of_identifiable_people
  Recommendation (ours): avoid photos where one person's face is the subject; prefer street scenes, crowds, backs, objects, buildings. Not a legal conclusion.
- India freedom of panorama: Copyright Act 1957 section 52(s) permits making or publishing a painting, drawing, engraving or photograph of a work of architecture; 52(t) the same for sculptures or other artistic works permanently situated in a public place. It does not extend to 2D works (paintings, murals, posters, maps). Source: https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/India
  Practical meaning: photos of buildings and public statues are fine; photos where a mural or poster is the main subject are a risk. Commons-hosted files are expected to have passed this, but check the file page.

## 5. Things that could stop or limit this use

1. **Openverse is a search index, not a host.** The photo itself stays on Flickr, Wikimedia, rawpixel, etc. Providers can delete it, move it, block hotlinking or require referrers; `filter_dead=true` only checks at search time. Photos could break later. Fix: re-check links before launch and keep a fallback.
2. **Licence metadata can be wrong.** Openverse states it cannot guarantee accuracy; verify on the source page. Source: https://docs.openverse.org/api/reference/made_with_ov.html
3. **Anonymous rate limits** (20/min, 200/day observed) make live API calls from visitors unsuitable. Pre-fetch.
4. **Wikimedia thumbnail widths**: hotlinks must use a standard width or receive an error (400/429). Use 500, 960 or 1280.
5. **Wikimedia hotlinking is "not recommended"**; it may be rate-limited or blocked if traffic grows. Host copies ourselves if the site gets large (this keeps us within the terms if we keep the credit and licence; self-hosting a copy is allowed by the licences).
6. **Openverse `thumbnail` goes via the Openverse proxy** (API server); load limits unverified.
7. **BY-SA photos with our overlay** raise a ShareAlike question (section 3).
8. **People and personality rights** (section 4); also trademarks and logos visible in photos (unverified, not researched).
9. **Tracking parameters and referrer**: Wikimedia returns URLs with utm parameters; fine to keep. Whether the browser's Referer matters to Wikimedia hotlinking is unverified.
10. **Credit line must be real text** visible near each photo with links; a generic "Photos from Openverse" is not enough.
11. **Mature/sensitive content**: leave `mature=false` (default) on Openverse and review each photo.

## Sources

- https://api.openverse.org/v1/ and https://api.openverse.org/v1/schema/?format=json (OpenAPI schema; live GET calls)
- https://docs.openverse.org/api/reference/authentication_and_throttling.html
- https://docs.openverse.org/api/reference/made_with_ov.html
- https://wordpress.github.io/openverse-api/terms_of_service.html
- https://docs.openverse.org/packages/js/api_client/index.html
- https://www.mediawiki.org/wiki/API:Imageinfo
- https://www.mediawiki.org/wiki/API:Search
- https://www.mediawiki.org/wiki/Common_thumbnail_sizes
- https://commons.wikimedia.org/w/api.php (live GET calls)
- https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy
- https://wikitech.wikimedia.org/wiki/Robot_policy
- https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia
- https://commons.wikimedia.org/wiki/Commons:Photographs_of_identifiable_people
- https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/India
- https://wiki.creativecommons.org/wiki/Best_practices_for_attribution
- https://creativecommons.org/licenses/by/4.0/legalcode.en
- https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
- https://creativecommons.org/licenses/by/3.0/legalcode

Ran beyond pure page fetches: a few read-only GET requests with curl to api.openverse.org and commons.wikimedia.org / upload.wikimedia.org (search, headers) to confirm behaviour; no data was changed.
