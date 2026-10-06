import { expect, test } from "./fixtures";

// Phase 1 smoke test: proves the browser harness works on every device project.
// The full flow, layout and failure-state tests arrive with phase 2.
test("landing loads, menus load, no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const start = page.getByRole("button", { name: /find my coffee/i });
  await expect(start).toBeEnabled(); // enabled only once quiz_data.json has loaded
  expect(errors).toEqual([]);
});

test("the menus load without a <link rel=preload> (Firefox handles it badly) and the button enables", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="preload"][href*="quiz_data"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /find my coffee/i })).toBeEnabled();
});

test("if the early download fails, the page retries on its own and still loads the menus", async ({ page }) => {
  let calls = 0;
  await page.route("**/quiz_data.json", (r) => (++calls === 1 ? r.abort() : r.continue()));
  await page.goto("/");
  await expect(page.getByRole("button", { name: /find my coffee/i })).toBeEnabled({ timeout: 10000 });
  expect(calls).toBeGreaterThanOrEqual(2);
});

test("if the menus cannot be loaded at all, the page says so instead of waiting forever", async ({ page }) => {
  await page.route("**/quiz_data.json", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByText(/could not load the menus/i)).toBeVisible({ timeout: 10000 });
});

test("while the menus load, the coffee-pour animation shows (with a text alternative); afterwards it is gone", async ({ page }) => {
  await page.route("**/quiz_data.json", async (r) => { await new Promise((x) => setTimeout(x, 4000)); await r.continue(); });
  await page.goto("/");
  await expect(page.locator(".loading-widget .coffee-pour")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading the menus" })).toHaveCount(1);
  expect(await page.locator(".loading-widget .pour-tumbler").evaluate((e) => getComputedStyle(e).animationName)).toBe("pour-tip");
  await expect(page.getByRole("button", { name: /find my coffee/i })).toBeEnabled({ timeout: 10000 });
  await expect(page.locator(".loading-widget")).toHaveCount(0);
  await expect(page.locator(".cta-note")).toContainText("no login");
});

test("reduced motion: the pour animation holds a still, mid-pour pose", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/quiz_data.json", async (r) => { await new Promise((x) => setTimeout(x, 3000)); await r.continue(); });
  await page.goto("/");
  const t = page.locator(".loading-widget .pour-tumbler");
  await expect(t).toBeVisible();
  expect(await t.evaluate((e) => getComputedStyle(e).animationName)).toBe("none");
});
