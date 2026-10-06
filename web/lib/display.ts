// Display-only helpers. The data is never edited; these only decide how a name is shown.

export interface SplitName {
  main: string;
  sub: string | null;
  /** The separator that was removed (" - "), so main + sep + sub always rebuilds the original. */
  sep: string;
}

const SEPARATOR = /\s+[-–—]\s+/;

/** "Frozen Bottle - Milkshakes, Desserts And Ice Cream" -> main "Frozen Bottle", sub "Milkshakes, Desserts And Ice Cream". */
export function splitName(name: string): SplitName {
  const m = SEPARATOR.exec(name);
  if (!m || m.index === 0 || m.index + m[0].length >= name.length) return { main: name, sub: null, sep: "" };
  return { main: name.slice(0, m.index), sub: name.slice(m.index + m[0].length), sep: m[0] };
}

/** Franchises have no single pin (`maps_link` is "Any"), so link to a Google Maps search for all their outlets in Bengaluru. */
export function franchiseMapsUrl(name: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} all outlets Bengaluru`)}`;
}
