import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_SHOW_MS, SHOW_AFTER_MS, runReveal } from "@/lib/reveal";

describe("reveal timing (the brewing screen)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never shows the screen when the work is fast", async () => {
    const calls: boolean[] = [];
    const p = runReveal(() => 42, (v) => calls.push(v));
    await vi.advanceTimersByTimeAsync(10);
    expect(await p).toBe(42);
    await vi.advanceTimersByTimeAsync(2000);
    expect(calls).toEqual([]);
  });

  it("shows the screen after 250 ms of waiting and hides it when the work ends", async () => {
    const calls: boolean[] = [];
    const p = runReveal(() => "done", (v) => calls.push(v), 1500);
    await vi.advanceTimersByTimeAsync(SHOW_AFTER_MS - 1);
    expect(calls).toEqual([]);
    await vi.advanceTimersByTimeAsync(2);
    expect(calls).toEqual([true]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await p).toBe("done");
    expect(calls).toEqual([true, false]);
  });

  it("keeps the screen visible for at least 700 ms once shown", async () => {
    const calls: boolean[] = [];
    let resolved = false;
    const p = runReveal(() => 1, (v) => calls.push(v), 300).then((r) => { resolved = true; return r; }); // work ends at 300 ms, screen shown at 250 ms
    await vi.advanceTimersByTimeAsync(SHOW_AFTER_MS + 100);
    expect(calls).toEqual([true]);
    expect(resolved).toBe(false); // held back: shown for only about 100 ms so far
    await vi.advanceTimersByTimeAsync(MIN_SHOW_MS);
    expect(await p).toBe(1);
    expect(calls).toEqual([true, false]);
  });

  it("does not leave the screen up if the work throws", async () => {
    const calls: boolean[] = [];
    const p = runReveal(() => { throw new Error("boom"); }, (v) => calls.push(v), 400).catch((e) => e.message);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p).toBe("boom");
    expect(calls[calls.length - 1]).toBe(false);
  });
});
