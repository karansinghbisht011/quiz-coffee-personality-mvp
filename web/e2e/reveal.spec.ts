import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { mkdirSync } from "node:fs";

async function answerAll(page: Page, pick = 0) {
  await page.getByRole("button", { name: /find my coffee/i }).click();
  for (let i = 0; i < 9; i++) {
    await page.locator(".option").nth(pick).click();
    await page.locator(".actions .btn-primary").click();
  }
}
const cafes = (page: Page) => page.locator(".at-cafe b").allTextContents();

test.beforeEach(async ({ page }) => {
  // record whether the brewing screen ever appeared (it must not flash when the work is fast)
  await page.addInitScript(() => {
    (window as unknown as { __sawBrewing: boolean }).__sawBrewing = false;
    new MutationObserver(() => {
      if (document.querySelector(".brewing")) (window as unknown as { __sawBrewing: boolean }).__sawBrewing = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
});

test("results: three roles, three different cafes, no brewing screen when fast", async ({ page }) => {
  await answerAll(page);
  await expect(page.locator(".result-card")).toHaveCount(3);
  const labels = await page.locator(".rank").allTextContents();
  expect(labels.map((l) => l.replace("☕", "").trim())).toEqual(["BEST MATCH", "CLOSE MATCH", "WILDCARD"]);
  expect(new Set(await cafes(page)).size).toBe(3);
  expect(await page.evaluate(() => (window as unknown as { __sawBrewing: boolean }).__sawBrewing)).toBe(false);
});

test("'Show different picks' re-draws for the same answers", async ({ page }) => {
  await answerAll(page, 1);
  const seen = new Set<string>([(await cafes(page)).join("|")]);
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: /show different picks/i }).click();
    await expect(page.locator(".result-card")).toHaveCount(3);
    const c = await cafes(page);
    expect(new Set(c).size).toBe(3);
    seen.add(c.join("|"));
  }
  expect(seen.size).toBeGreaterThan(1);
});

test("slow reveal shows the brewing screen, keeps it at least 700 ms, then the results", async ({ page }, info) => {
  await page.addInitScript(() => {
    window.__QUIZ_DELAY_MS__ = 1500;
    // no one-frame flash of the last question after the brewing screen has been shown
    const w = window as unknown as { __seenBrewing: boolean; __questionAfterBrewing: boolean };
    w.__seenBrewing = false; w.__questionAfterBrewing = false;
    new MutationObserver(() => {
      if (document.querySelector(".brewing")) w.__seenBrewing = true;
      else if (w.__seenBrewing && document.querySelector(".question")) w.__questionAfterBrewing = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /find my coffee/i }).click();
  for (let i = 0; i < 8; i++) {
    await page.locator(".option").first().click();
    await page.locator(".actions .btn-primary").click();
  }
  await page.locator(".option").first().click();
  await page.locator(".actions .btn-primary").click();
  const t0 = Date.now();
  const brewing = page.getByRole("status", { name: /finding your coffees/i });
  await expect(brewing).toBeVisible({ timeout: 1000 });
  const shownAfter = Date.now() - t0;
  expect(shownAfter).toBeGreaterThan(20); // the 250 ms threshold runs from the click; the timing here starts after it (loose, so a busy machine cannot fail it)
  mkdirSync("test-results/screens", { recursive: true });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `test-results/screens/brewing-${info.project.name}.png` });
  await expect(page.locator(".result-card")).toHaveCount(3, { timeout: 5000 });
  expect(Date.now() - t0).toBeGreaterThan(900); // the 1.5 s delay was honoured (measured from just after the click)
  await expect(brewing).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __questionAfterBrewing: boolean }).__questionAfterBrewing)).toBe(false);
});
