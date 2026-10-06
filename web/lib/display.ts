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
