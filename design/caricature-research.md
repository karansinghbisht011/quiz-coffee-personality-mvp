# Caricature illustration research: person holding a coffee (inline SVG)

Researched 2026-10-06. Goal: draw our own flat-vector, bold-ink-outline characters as inline SVG, placed over a photo. Sections marked "(craft guidance)" are general illustration practice written by the researcher, not quoted from one source. Nothing here copies or traces any artist's work.

## 1. Core principles

1. **Find one or two distinctive features and push them.** Caricature works by choosing what makes someone recognisable (hair shape, glasses, jaw, posture) and exaggerating it. Search sources advise pushing past comfortable, then scaling back until it still reads naturally. For a quiz character, the "feature" is the personality: the hair, the outfit and the pose, not facial likeness.
2. **Head bigger than body.** Caricature enlarges the head. Common reference: adults are 6 to 8 heads tall in realism, children 3 to 4. A caricature sits well below that. We use about 3 heads (see style guide).
3. **Shape language.** Round shapes read friendly and relaxed, squares read stable and stubborn, triangles read sharp and energetic. Pick one dominant shape per character (craft guidance).
4. **Simplify to a strong silhouette.** If the filled shape in solid black still shows who and what (person plus cup), the drawing works. Fewer shapes, bolder shapes.
5. **Expressive face and pose.** Expression lives in eyebrows and mouth; personality in posture. Use big gestures for energetic characters, still compact poses for calm ones.
6. **One outline weight.** Same stroke width on all main shapes; a thinner width only for inner detail (one step down).
7. **Limited palette.** 5 to 6 flat colours plus ink. No gradients, no shading except one optional flat shadow shape.

## 2. Common mistakes that look amateur (craft guidance)

- Mixed stroke widths with no logic; wobbly or uneven curves.
- Too many small details (eyelashes, fingers, folds) that vanish at phone size.
- Realistic proportions on a cartoon head, or a tiny head on a big body.
- Features floating: eyes too small or too far apart for the head size.
- Hands drawn as five separate fingers, producing mangled shapes.
- Stiff, front-on, symmetrical poses; arms glued to the torso.
- Colour outside the palette, pure black next to soft browns, random highlights.
- Cup drawn from a different perspective than the face; the cup is the hero prop and must be big enough to read.
- Outline colour or weight changing between characters in the same set.
- Stereotype shortcuts (see section 5).

## 3. Keeping a set consistent

- Build one **base head and one base body** with fixed proportions, then swap only hair, outfit, accessory and expression.
- Fix a **unit**: head height = 1 unit; measure everything in that unit.
- Same stroke width, same line cap and join, same corner radius across the set.
- Same eye style, same nose rule (for example a small curve or none), same mouth rule.
- Same palette tokens; skin and hair tones come from the same short list.
- Same light direction if any flat shadow is used (for example lower right).
- Review the set side by side at final display size before finishing.

## 4. Drawing the parts simply

**Hair.** Draw it as one or two big silhouette shapes behind and over the head, not strands. Add two or three curved inner lines for flow. Volume sits above the head: curly = scalloped edge, straight = smooth rounded cap, bun/ponytail = one extra circle or teardrop.

**Eyes.** Pick a style and keep it. Simple options: solid ink ovals or dots (cheap and friendly), or white ovals with a dark pupil. Add a short thick eyebrow above; eyebrow angle carries emotion. Squint or happy eyes = upward arc.

**Hands holding a cup.** Do not draw five fingers. Use a rounded mitten shape: one oval for the palm wrapped around the cup, with one thumb shape (small rounded rectangle) on the near side and two or three tiny curved lines for fingers. Put the cup in front of the palm, then overlap the thumb on top. Two-handed hold = two mittens either side of the cup, cosy and expressive. Raise the cup to chest or chin height so the face and the cup are close.

**Steel tumbler ("davara") set (South Indian filter coffee).** Two parts: a wide-mouthed, slightly tapered tumbler sitting inside a shallow, wide-lipped dish (the davara). Draw as: trapezoid body (wider at the top) with rounded corners, a thin horizontal band near the rim, and a wider flat ellipse/ellipse-ish dish below it. Fill with a pale blue-grey (use sky tone with a lighter highlight stripe). Add coffee-brown froth line at top and two or three curly steam lines. Keep the stripe highlight as one vertical white-ish rounded rectangle.

## 5. Making the character feel Bengaluru without stereotypes

- Prefer **everyday, current city life** over costumes: casual layered tee or kurta-style shirt over jeans, a lanyard and ID badge (tech park), a backpack, sneakers, earphones, a rain jacket or umbrella in monsoon scenes.
- City props: filter coffee in a steel tumbler and davara, a cloth tote, a two-wheeler helmet, a phone with a map open, a Namma Metro purple-line cue (use a generic purple stripe, no logos), an umbrella.
- Climate and greenery: clouds and drizzle, rain trees and gulmohar-style leaf shapes in the leaf green.
- Avoid: caricaturing skin colour, accent or religion; mocking dress; one "typical" techie or auto driver as a joke. Make every character warm and dignified; the humour comes from the situation (traffic, rain, coffee), not from the person's identity.
- Keep logos and brand marks out; draw generic shapes.

## 6. SVG construction checklist

- [ ] One `viewBox` for every character, for example `0 0 240 400`; `width`/`height` omitted so CSS controls size. Add `role="img"` and a `<title>`.
- [ ] Layer order, back to front: back hair, back arm, body/outfit, neck, head, ears, face features, front hair/fringe, front arm and hand, cup, steam, accessories.
- [ ] Use `<g id="...">` groups per part so hair and outfit can be swapped (`<use href="#hair-curly">`).
- [ ] Reuse one head and one body in `<defs>`; instantiate with `<use>` and change only the swappable parts.
- [ ] One main `stroke-width` (5 units on a 400-unit-high figure, 3 for inner detail; tune once and then fix).
- [ ] `stroke-linejoin="round"` and `stroke-linecap="round"` on all strokes (MDN lists miter, round, bevel as join values; round is what keeps corners friendly).
- [ ] Set stroke and fill via CSS variables (`--ink`, `--coffee`, ...) so the palette is one place.
- [ ] Draw outlines on filled shapes (fill + stroke on the same path) to keep the path count low.
- [ ] Use `vector-effect="non-scaling-stroke"` only if the stroke must stay constant when scaled; otherwise scale the whole SVG together.
- [ ] Avoid filters, gradients and raster images inside the SVG; keep each character under about 10 KB.
- [ ] Put a mild white or cream outer "sticker" stroke behind the figure so it separates from a busy photo (a duplicated silhouette path with thicker cream stroke).
- [ ] Test on the real photo at phone width and in dark mode.

## 7. Short style guide: our guy and our girl

**Proportions (head height = 1 unit):**
- Total height 3 units: head 1, torso 1, legs 1 (legs are often cropped by the photo edge; the visible figure may be 2 units).
- Head width 0.9 units, shoulders 1.2 units for the guy, 1.1 for the girl.
- Eyes sit on the horizontal middle line of the head, spaced 0.4 units apart, each 0.12 units wide.
- Cup height 0.35 units for a paper cup, 0.45 for the tumbler plus davara; held at chest or chin level, in front of the torso.
- Hands: mitten shapes about 0.25 units.

**Outline:** 5 units main, 3 units inner detail, round joins and caps, colour ink #25231f.

**Palette (6 colours plus ink, all from the brand set):**

| Role | Hex |
|---|---|
| Ink (outline, eyes) | #25231f |
| Coffee (hair, cup sleeve, steam tint) | #6b452d |
| Cream (shirt, outer sticker stroke, highlights) | #fffaf2 |
| Leaf (jacket, tote, plants) | #4f6648 |
| Yellow (rain jacket, auto roof, accents) | #f4d77e |
| Rose (cheeks, skin-warm accent, scarf) | #e9b9ab |
| Sky (tumbler, clouds, rain) | #cfe0e4 |

Skin tones need to be added by us; suggested short list (new, not in the brand set, so agree it first): #c98f6b, #a86f4c, #8a5a3c. Check the contrast against the photo.

**Guy:** short thick wavy hair (coffee), light beard stubble as small ink dashes, squared jaw, cream tee under a leaf-green overshirt, lanyard in yellow.
**Girl:** shoulder-length hair with a side fringe (ink or coffee), round face, rose scarf or tote, yellow rain jacket variant, small round earrings.

## 8. Eight scene ideas (each with concrete props)

1. **Autorickshaw.** Yellow-roofed three-wheeler (use yellow and ink), passenger seated holding a davara set, meter box on the dashboard, a hanging charm or fairy lights strip.
2. **Traffic policeman.** Cartoon officer on a small podium, white gloves up in a stop sign, whistle, cap and a paper cup of coffee held in the other hand. Keep him friendly, no real insignia.
3. **Traffic jam.** Rows of simple rounded vehicles (bus, car, scooters) in leaf, yellow and rose; character leaning out of a car window with the cup; honking "beep" speech marks and a clock.
4. **Rain and clouds.** Fat sky-coloured clouds with rain dashes, umbrella in one hand and cup in the other, puddle ellipse with a ripple, steam from the cup.
5. **A city signal.** Tall traffic light with three circles (red, yellow, green) with a countdown number, zebra crossing stripes, character waiting with the cup.
6. **Landmarks.** Simple, generic silhouettes of recognisable but non-copyrighted-style shapes: a domed palace-like tower outline, a glass-house-style roof, a tall stone-gateway shape, a bull statue silhouette; keep them stylised. Check freedom of panorama (India allows photographs of buildings/sculptures in public; our drawing is our own simplified shapes anyway).
7. **Tech park.** Glass towers in sky colour, lanyard and laptop bag, a food-court style kiosk, a filter-coffee counter with steel tumblers stacked.
8. **Window-seat view holding a cup.** Window frame (ink outline) with rain streaks or a tree-lined road behind, character in side profile with both hands round a cup, a book or phone on the ledge, a small plant in leaf green.

## Sources used

- https://www.learn-to-draw-expressively.com/how-to-draw-caricatures.html (search result summary: caricature principles)
- https://www.toonsmag.com/caricature-artists-exaggerate-features-for-humor/ (search result summary: exaggeration)
- https://www.adobe.com/creativecloud/illustration/discover/how-to-draw-caricature.html (search result summary: caricature basics)
- https://skyryedesign.com/art/cartoon-body-proportions/ (search result summary: head-to-body ratios)
- https://www.tomrichmond.com/sunday-mailbag-best-headbody-ratio/05/06/2016/ (search result summary: head-to-body ratio)
- https://www.clipstudio.net/en/characterart/art-style/ (search result summary: flat character styles)
- https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin (fetched: join values)

Note: pages other than the MDN page were read only through search-result summaries, not fetched in full. Sections 2, 4, 5 and 6 are researcher craft guidance and are unverified against a specific source.
