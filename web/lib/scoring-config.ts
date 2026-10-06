// Scoring v2 parameters ("Quality-first", locked 2026-10-06 from the scoring lab:
// IMPLEMENTATION.md section 4.4a, specs/scoring-spec.md section 8). Change them only with a
// lab run and a note in those documents.
export const SCORING = {
  /** Share of the score that comes from the cafe part (the coffee part gets 1 minus this). */
  cafeShare: 0.3,
  /** A cafe dimension with no data counts this much instead of 0 (neutral). */
  neutralBlank: 0.5,
  /** Rarity weights are clamped to this range. */
  idfMin: 0.6,
  idfMax: 1.8,
  /** Slight skew towards popular cafes: score x (1 + alpha x prior(rank)). */
  alpha: 0.08,
  /** A big menu has more chances to hold a high scorer: shrink a cafe's score by up to this share. */
  menuPenalty: 0.12,
  /** Candidate bands, as a share of the top cafe score, for the three result roles. */
  band1: 0.97,
  band2: 0.9,
  band3: 0.8,
  /** Within a cafe, drinks within this share of its best drink can be drawn. */
  coffeeBand: 0.95,
  /** Softness of the weighted draw (slot 1 uses tau/4, slot 2 tau/2, slot 3 tau). */
  tau: 0.16,
  /** A band with fewer cafes than this is widened to the next best ones (slots 2 and 3 only: the Best match is never widened). */
  minCandidates: 8,
  /** A coffee needs at least this many of the 6 coffee dimensions filled (relaxed to 1 if fewer than 3 cafes qualify). */
  minDimensions: 3,
} as const;

export const SLOT_LABELS = { 1: "Best match", 2: "Close match", 3: "Wildcard" } as const;
