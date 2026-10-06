// Small seeded generator so every random choice can be reproduced and tested.

/** mulberry32: returns a function giving numbers in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seed = hash(answer letters + roll). FNV-1a, 32 bit. */
export function makeSeed(letters: string, roll: number): number {
  let h = 0x811c9dc5;
  for (const ch of `${letters}|${roll >>> 0}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A fresh roll for the browser (not used in tests, which pass fixed rolls). */
export const newRoll = () => (Math.random() * 4294967296) >>> 0;
