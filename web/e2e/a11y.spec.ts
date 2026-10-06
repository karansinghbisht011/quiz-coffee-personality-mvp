// Accessibility: axe on the landing page, a question and the results, on every device size.
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

async function violations(page: Page) {
  const r = await new AxeBuilder({ page })
    .exclude("nextjs-portal") // the Next.js dev badge exists only in development
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

test("no accessibility violations on landing, a question and the results", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /find my coffee/i }).waitFor();
  expect(await violations(page), "landing").toEqual([]);
  await page.getByRole("button", { name: /find my coffee/i }).click();
  expect(await violations(page), "question").toEqual([]);
  await page.locator(".option").first().click();
  expect(await violations(page), "question with a selected answer").toEqual([]);
  for (let i = 0; i < 9; i++) {
    await page.locator(".option").first().click();
    await page.locator(".actions .btn-primary").click();
  }
  await expect(page.locator(".result-card")).toHaveCount(3);
  await page.waitForTimeout(700);
  expect(await violations(page), "results").toEqual([]);
});

test("keyboard only: the whole quiz can be completed without a mouse", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: /find my coffee/i });
  await start.waitFor();
  await start.focus();
  await page.keyboard.press("Enter");
  for (let i = 0; i < 9; i++) {
    await page.locator(".option").first().focus();
    await page.keyboard.press("Enter"); // choose
    await page.locator(".actions .btn-primary").focus();
    await page.keyboard.press("Enter"); // next
  }
  await expect(page.locator(".result-card")).toHaveCount(3);
  await expect(page.getByRole("button", { name: /show different picks/i })).toBeVisible();
});

test("reduced motion: the brewing screen and results do not animate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { window.__QUIZ_DELAY_MS__ = 1200; });
  await page.goto("/");
  await page.getByRole("button", { name: /find my coffee/i }).click();
  for (let i = 0; i < 9; i++) {
    await page.locator(".option").first().click();
    await page.locator(".actions .btn-primary").click();
  }
  const brewing = page.getByRole("status", { name: /finding your coffees/i });
  await expect(brewing).toBeVisible({ timeout: 1500 });
  const anim = await page.evaluate(() => ["brew-rain", "brew-steam", "brew-auto"].map((c) => getComputedStyle(document.querySelector(`.${c}`)!).animationName));
  expect(anim).toEqual(["none", "none", "none"]);
  await expect(page.locator(".result-card")).toHaveCount(3, { timeout: 5000 });
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".result-card")!).animationName)).toBe("none");
});
