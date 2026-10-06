// Layout gates (REQUIREMENTS sections 7a and 7b): desktop first-fold rules first, then mobile web compatibility.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { mkdirSync } from "node:fs";

const SCREENS = "test-results/screens";

async function goQuiz(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: /find my coffee/i }).click();
}
async function finish(page: Page, pick = 0) {
  await goQuiz(page);
  for (let i = 0; i < 9; i++) {
    await page.locator(".option").nth(pick).click();
    await page.locator(".actions .btn-primary").click();
  }
  await expect(page.locator(".result-card")).toHaveCount(3);
}
const kind = (w: number) => (w >= 1024 ? "desktop" : w >= 768 ? "tablet" : "phone");
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const bottom = async (page: Page, sel: string, nth = 0) => {
  const b = await page.locator(sel).nth(nth).boundingBox();
  return b ? b.y + b.height : NaN;
};

test.describe("no horizontal scroll, tap targets, text size", () => {
  test("landing, a question and the results fit the width and have 44 px targets", async ({ page }, info) => {
    mkdirSync(SCREENS, { recursive: true });
    await page.goto("/");
    await page.getByRole("button", { name: /find my coffee/i }).waitFor();
    expect(await noOverflow(page), "landing overflow").toBeLessThanOrEqual(0);
    await page.screenshot({ path: `${SCREENS}/landing-${info.project.name}.png` });
    const small = async () =>
      page.evaluate(() =>
        [...document.querySelectorAll("button, a")]
          .filter((el) => !el.closest("nextjs-portal") && !el.hasAttribute("data-nextjs-dev-tools-button") && !el.closest(".photo-credit")) // inline links inside a sentence are exempt (WCAG 2.5.8)
          .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 43.5 || r.width < 43.5); })
          .map((el) => `${(el.textContent || "").trim().slice(0, 20)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));
    expect(await small(), "landing targets").toEqual([]);
    await page.getByRole("button", { name: /find my coffee/i }).click();
    expect(await noOverflow(page), "question overflow").toBeLessThanOrEqual(0);
    expect(await small(), "question targets").toEqual([]);
    await page.screenshot({ path: `${SCREENS}/question-${info.project.name}.png` });
    for (let i = 0; i < 9; i++) {
      await page.locator(".option").first().click();
      await page.locator(".actions .btn-primary").click();
    }
    await expect(page.locator(".result-card")).toHaveCount(3);
    await page.waitForTimeout(700); // let the entrance animation finish
    expect(await noOverflow(page), "result overflow").toBeLessThanOrEqual(0);
    expect(await small(), "result targets").toEqual([]);
    await page.screenshot({ path: `${SCREENS}/result-${info.project.name}.png` });
    await page.screenshot({ path: `${SCREENS}/result-full-${info.project.name}.png`, fullPage: true });
  });

  test("main text is at least 16 px and secondary text at least 12 px", async ({ page }) => {
    await finish(page);
    const sizes = await page.evaluate(() => {
      const px = (sel: string) => [...document.querySelectorAll(sel)].map((e) => parseFloat(getComputedStyle(e).fontSize));
      return { coffee: px(".coffee-name"), cafe: px(".cafe-main"), why: px(".why"), chip: px(".chip"), note: px(".footnote") };
    });
    for (const v of [...sizes.coffee, ...sizes.cafe]) expect(v).toBeGreaterThanOrEqual(17);
    for (const v of [...sizes.why, ...sizes.chip, ...sizes.note]) expect(v).toBeGreaterThanOrEqual(12);
  });
});

test.describe("first fold", () => {
  test("landing: headline and the start button are visible without scrolling", async ({ page }) => {
    const vp = page.viewportSize()!;
    test.skip(vp.height < 500, "landscape phone: too short for a hero; it only has to scroll");
    await page.goto("/");
    const btn = page.getByRole("button", { name: /find my coffee/i });
    await btn.waitFor();
    const b = (await btn.boundingBox())!;
    expect(b.y + b.height, "start button bottom").toBeLessThanOrEqual(vp.height - 8);
    const h1 = (await page.locator("h1").boundingBox())!;
    expect(h1.y + h1.height).toBeLessThanOrEqual(vp.height);
  });

  test("a question: the question, options and Next are reachable without scrolling", async ({ page }) => {
    const vp = page.viewportSize()!;
    await goQuiz(page);
    expect(await bottom(page, ".actions .btn-primary"), "Next button bottom").toBeLessThanOrEqual(vp.height + 0.5);
    expect(await bottom(page, ".question")).toBeLessThanOrEqual(vp.height);
  });

  test("results: desktop shows all 3 cards, tablet the first card, phone the first card's names", async ({ page }) => {
    const vp = page.viewportSize()!;
    await finish(page);
    await page.waitForTimeout(700);
    const k = kind(vp.width);
    if (vp.height < 500) return; // landscape phone: no fold rule, only that it scrolls cleanly (overflow test above)
    if (k === "desktop") {
      for (let i = 0; i < 3; i++) expect(await bottom(page, ".result-card", i), `card ${i + 1} bottom`).toBeLessThanOrEqual(vp.height - 8);
    } else if (k === "tablet") {
      expect(await bottom(page, ".result-card", 0), "card 1 bottom").toBeLessThanOrEqual(vp.height);
    } else {
      expect(await bottom(page, ".result-card .at-cafe", 0), "card 1 cafe name bottom").toBeLessThanOrEqual(vp.height - 60); // above the sticky bar
    }
  });
});

test.describe("type hierarchy and clamping", () => {
  test("cafe name is bold and larger than 17 px; coffee name is no bigger than 22 px; both clamp to two lines", async ({ page }) => {
    await finish(page);
    const s = await page.evaluate(() => {
      const cs = (sel: string) => getComputedStyle(document.querySelector(sel)!);
      return { coffee: parseFloat(cs(".coffee-name").fontSize), cafe: parseFloat(cs(".cafe-main").fontSize), cafeWeight: Number(cs(".cafe-main").fontWeight), clamp1: cs(".coffee-name").getPropertyValue("-webkit-line-clamp"), clamp2: cs(".cafe-main").getPropertyValue("-webkit-line-clamp") };
    });
    expect(s.coffee).toBeLessThanOrEqual(22.01);
    expect(s.cafe).toBeGreaterThanOrEqual(17);
    expect(s.cafeWeight).toBeGreaterThanOrEqual(700);
    expect(s.clamp1).toBe("2");
    expect(s.clamp2).toBe("2");
  });
});

test.describe("long names", () => {
  test("a very long coffee name and a cafe name with a subtitle stay inside the card", async ({ page }) => {
    const mk = (id: number, cafe: string, name: string) => ({ id, cafe, name, strength: "strong", sweetness: "none", milk: "black", temperature: "hot", flavour: ["classic"], adventurousness: "familiar" });
    const cafes = {
      "Frozen Bottle - Milkshakes, Desserts And Ice Cream": { maps_link: "https://example.test/a", type: "standalone", popularity_rank: 1, vibe: ["cozy"], crowd: null, setting: null },
      "Roastea - Curated Coffee And Tea Artisans": { maps_link: "Any", type: "franchise", popularity_rank: 2, vibe: ["cozy"], crowd: null, setting: null },
      "Si Nonna's - The Original Sourdough Pizza": { maps_link: "https://example.test/c", type: "standalone", popularity_rank: 3, vibe: ["cozy"], crowd: null, setting: null },
    };
    const long = "Manual Brew — Ratnagiri Culture Naturals Jasmine Hot / Cold with extra long words abcdefghijklmnopqrstuvwxyz0123456789";
    const coffees = Object.keys(cafes).map((c, i) => mk(i + 1, c, i === 0 ? long : `Strong Black ${i}`));
    await page.route("**/quiz_data.json", (r) => r.fulfill({ json: { cafes, coffees } }));
    await finish(page);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    const first = page.locator(".result-card").first();
    const overflowing = await first.evaluate((card) => {
      const r = card.getBoundingClientRect();
      return [...card.querySelectorAll("*")].filter((e) => e.getBoundingClientRect().right > r.right + 1).length;
    });
    expect(overflowing).toBe(0);
    await expect(page.locator(".cafe-sub").first()).toBeVisible();
    const titles = await page.locator(".coffee-name").evaluateAll((els) => els.map((e) => e.getAttribute("title") ?? ""));
    expect(titles.some((t) => t.includes("Manual Brew"))).toBe(true);
  });
});

test.describe("sticky bars on phones", () => {
  test("Back and Next stay at the bottom of the screen; so do the result actions", async ({ page }) => {
    const vp = page.viewportSize()!;
    test.skip(vp.width >= 768, "sticky bars are phone-only");
    // A sticky bar is pinned to the screen bottom only while its card is taller than the screen; a short card ends above it.
    const cardBottom = async (sel: string) => { const b = (await page.locator(sel).boundingBox())!; return b.y + b.height; };
    await goQuiz(page);
    const bar = (await page.locator(".actions").boundingBox())!;
    expect(bar.y + bar.height, "Back/Next inside the screen").toBeLessThanOrEqual(vp.height + 0.5);
    if ((await cardBottom(".quiz-card")) > vp.height + 1) expect(bar.y + bar.height, "Back/Next pinned").toBeGreaterThan(vp.height - 2);
    await finish(page);
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(200);
    const acts = (await page.locator(".results-actions").boundingBox())!;
    expect(acts.y + acts.height, "result actions inside the screen").toBeLessThanOrEqual(vp.height + 0.5);
    if ((await cardBottom(".results-main")) > vp.height + 1) {
      expect(acts.y + acts.height, "result actions pinned while the cards are on screen").toBeGreaterThan(vp.height - 2);
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(300);
      const acts2 = (await page.locator(".results-actions").boundingBox())!;
      // at the very end the bar rests at the bottom of the results card, above the footer line
      expect(acts2.y + acts2.height, "visible after scrolling to the end").toBeLessThanOrEqual(vp.height + 0.5);
      expect(acts2.y, "visible after scrolling to the end").toBeGreaterThanOrEqual(0);
    }
  });
});
