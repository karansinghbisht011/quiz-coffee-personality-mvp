// A low-end phone: 6x slower CPU and a slow network (Chrome DevTools Protocol). Measures real waits.
import { expect, test } from "./fixtures";
import { mkdirSync, appendFileSync } from "node:fs";

test("6x CPU slowdown and slow 3G: the quiz stays usable and reports its waits", async ({ page, context }, info) => {
  test.skip(info.project.name !== "phone-360x640", "one phone profile is enough");
  test.setTimeout(240000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 }); // slow 3G
  const t0 = Date.now();
  await page.goto("/");
  const start = page.getByRole("button", { name: /find my coffee/i });
  await expect(start).toBeVisible();
  const shell = Date.now() - t0;
  const loadingText = await page.locator(".cta-note").textContent();
  await expect(start).toBeEnabled({ timeout: 120000 });
  const dataReady = Date.now() - t0;
  await start.click();
  for (let i = 0; i < 8; i++) {
    await page.locator(".option").first().click();
    await page.locator(".actions .btn-primary").click();
  }
  await page.locator(".option").first().click();
  const t1 = Date.now();
  await page.locator(".actions .btn-primary").click();
  await expect(page.locator(".result-card")).toHaveCount(3, { timeout: 20000 });
  const reveal = Date.now() - t1;
  mkdirSync("test-results", { recursive: true });
  const line = { shellVisibleMs: shell, menusReadyMs: dataReady, loadingMessage: loadingText, revealMs: reveal };
  appendFileSync("test-results/throttled.json", JSON.stringify(line) + "\n");
  console.log("THROTTLED", JSON.stringify(line));
  expect(reveal).toBeLessThan(3000);
});
