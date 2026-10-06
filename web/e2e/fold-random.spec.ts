// The headline desktop rule over many different results, not one answer path:
// all three result cards fully visible without scrolling at 1280x720 and 1440x900.
import { expect, test } from "./fixtures";

test("desktop: all three cards fit the first screen for 15 different random quizzes", async ({ page }) => {
  const vp = page.viewportSize()!;
  test.skip(vp.width < 1024, "desktop rule");
  test.setTimeout(180000);
  let seed = 11;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
  const worst: number[] = [];
  for (let n = 0; n < 15; n++) {
    await page.goto("/");
    await page.getByRole("button", { name: /find my coffee/i }).click();
    for (let i = 0; i < 9; i++) {
      await page.locator(".option").nth(Math.floor(rnd() * 4)).click();
      await page.locator(".actions .btn-primary").click();
    }
    await page.locator(".result-card").nth(2).waitFor();
    await page.waitForTimeout(650); // entrance animation
    const bottom = await page.evaluate(() => document.querySelectorAll(".result-card")[2].getBoundingClientRect().bottom);
    worst.push(bottom);
  }
  expect(Math.max(...worst), `third card bottoms: ${worst.map(Math.round).join(", ")}`).toBeLessThanOrEqual(vp.height - 8);
});
