// The reveal state machine: runs the recommendation after the screen has had a chance to paint,
// and shows the brewing screen only if the work is slow, so it never flashes.
export const SHOW_AFTER_MS = 250;
export const MIN_SHOW_MS = 700;

declare global {
  interface Window {
    /** Test hook: pretend the work takes this long. Set only by Playwright. */
    __QUIZ_DELAY_MS__?: number;
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Runs `work`. `setBrewing(true)` is called if it takes longer than SHOW_AFTER_MS; once shown, the
 * screen stays at least MIN_SHOW_MS, then `setBrewing(false)` is called before the result returns.
 */
export async function runReveal<T>(work: () => T, setBrewing: (visible: boolean) => void, delayMs = 0): Promise<T> {
  let shownAt: number | null = null;
  const timer = setTimeout(() => {
    shownAt = Date.now();
    setBrewing(true);
  }, SHOW_AFTER_MS);
  try {
    await sleep(0); // let the click paint first
    if (delayMs > 0) await sleep(delayMs);
    const result = work();
    if (shownAt !== null) {
      const left = MIN_SHOW_MS - (Date.now() - shownAt);
      if (left > 0) await sleep(left);
    }
    return result;
  } finally {
    clearTimeout(timer);
    if (shownAt !== null) setBrewing(false);
  }
}
