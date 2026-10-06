// The scene frame: loader, photo (mocked), credit, fallback on failure and on timeout.
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SVG = (c: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="${c}"/><circle cx="480" cy="320" r="160" fill="#d9642b"/></svg>`;
const photoRoute = (page: Page, opts: { delay?: number; status?: number } = {}) =>
  page.route("**/commons.wikimedia.org/**", async (r) => {
    if (opts.delay) await new Promise((x) => setTimeout(x, opts.delay));
    if (opts.status && opts.status !== 200) return r.fulfill({ status: opts.status, body: "nope" });
    return r.fulfill({ status: 200, contentType: "image/svg+xml", body: SVG("#9ab8c4") });
  });
async function finish(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /find my coffee/i }).click();
  for (let i = 0; i < 9; i++) { await page.locator(".option").first().click(); await page.locator(".actions .btn-primary").click(); }
}

test("a photo loads: cards first, loader then photo, credit with links, caricature on top", async ({ page }, info) => {
  await photoRoute(page, { delay: 900 });
  await finish(page);
  await expect(page.locator(".result-card")).toHaveCount(3);
  await expect(page.locator(".doodle-loader")).toBeVisible(); // cards are there while the photo is still on its way
  await expect(page.locator(".scene-photo.on")).toBeVisible({ timeout: 5000 });
  await expect(page.locator(".doodle-loader")).toHaveCount(0);
  const credit = page.locator(".photo-credit");
  await expect(credit).toContainText("Photo:");
  await expect(credit.locator("a")).toHaveCount(2);
  await expect(page.locator(".caricature")).toBeVisible();
  if ((page.viewportSize()?.height ?? 0) >= 500) await expect(page.locator(".scene-title")).toBeVisible(); // hidden on a phone held sideways, to save space
  mkdirSync("test-results/screens", { recursive: true });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/screens/scene-photo-${info.project.name}.png` });
});

test("a failing photo falls back to the drawn scene, silently", async ({ page }, info) => {
  await photoRoute(page, { status: 404 });
  await finish(page);
  await expect(page.locator(".fallback-scene")).toBeVisible();
  await expect(page.locator(".photo-credit")).toHaveCount(0);
  await expect(page.locator(".caricature")).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `test-results/screens/scene-fallback-${info.project.name}.png` });
});

test("a photo slower than 6 seconds falls back to the drawn scene", async ({ page }) => {
  test.setTimeout(60000);
  await photoRoute(page, { delay: 9000 });
  await finish(page);
  await expect(page.locator(".doodle-loader")).toBeVisible();
  await expect(page.locator(".fallback-scene")).toBeVisible({ timeout: 9000 });
  await expect(page.locator(".doodle-loader")).toHaveCount(0);
});
