// The curated scene photos (web/data/scene-photos.json): licence, host, size, credit and variety rules
// (REQUIREMENTS section 7, specs/scene-spec.md section 4), plus the seeded random choice.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { ALL_PHOTOS, ALLOWED_HOSTS, ALLOWED_LICENCE, WIDTHS, photoUrl, photosFor, pickPhoto, placeLine } from "@/lib/photos";
import { SCENES } from "@/lib/scenes";
import { mulberry32 } from "@/lib/rng";

const approved = ALL_PHOTOS.filter((p) => p.approved);

describe("photo set", () => {
  it("has at least 6 approved photos for every scene", () => {
    for (const s of SCENES) expect(photosFor(s.id).length, s.id).toBeGreaterThanOrEqual(6);
  });
  it("has unique ids and unique source pages", () => {
    expect(new Set(ALL_PHOTOS.map((p) => p.id)).size).toBe(ALL_PHOTOS.length);
    expect(new Set(ALL_PHOTOS.map((p) => `${p.scene}|${p.source_url}`)).size).toBe(ALL_PHOTOS.length);
  });
  it("uses only allowed licences, with a licence link", () => {
    for (const p of approved) {
      expect(p.licence, p.id).toMatch(ALLOWED_LICENCE);
      expect(() => new URL(p.licence_url), p.id).not.toThrow();
    }
  });
  it("has every required field, alt text and an author for the licences that need one", () => {
    for (const p of approved) {
      for (const k of ["id", "scene", "title", "file", "alt", "source_url", "image_url"] as const) expect(String(p[k]).length, `${p.id}.${k}`).toBeGreaterThan(0);
      expect(p.alt.length, p.id).toBeGreaterThan(10);
      if (/BY/.test(p.licence)) expect(p.author.length, `${p.id} author`).toBeGreaterThan(1);
    }
  });
  it("links only to allowed hosts, and builds hotlink URLs at standard Wikimedia widths", () => {
    for (const p of approved) {
      expect(ALLOWED_HOSTS).toContain(new URL(p.image_url).host);
      expect(ALLOWED_HOSTS).toContain(new URL(p.source_url).host);
      for (const w of WIDTHS) {
        const u = new URL(photoUrl(p, w));
        expect(ALLOWED_HOSTS).toContain(u.host);
        expect([960, 1280]).toContain(Number(u.searchParams.get("width")));
      }
    }
  });
  it("only uses photos that are large and landscape", () => {
    for (const p of approved) { expect(p.width, p.id).toBeGreaterThanOrEqual(1600); expect(p.width / p.height, p.id).toBeGreaterThanOrEqual(1.3); }
  });
  it("has at most 2 photos per photographer in a scene, and at most 2 per landmark in the landmarks pool", () => {
    const by = new Map<string, number>();
    for (const p of approved) by.set(`${p.scene}|${p.author}`, (by.get(`${p.scene}|${p.author}`) ?? 0) + 1);
    for (const [k, n] of by) expect(n, k).toBeLessThanOrEqual(2);
    const mon = [/palace/i, /lalbagh|glass.?house/i, /cubbon/i, /cathedral|st\.? mark/i, /market/i, /vidhana/i, /metro/i, /commercial street/i, /temple/i];
    for (const rx of mon) expect(photosFor("landmarks").filter((p) => rx.test(`${p.title} ${p.alt}`)).length, String(rx)).toBeLessThanOrEqual(2);
  });
  it("names a place only when the photo's own source text states one (and says where), and labels non-Bengaluru places", () => {
    for (const p of approved as (typeof approved[number] & { place_source?: string })[]) {
      if (p.place) expect(["title", "description", "category"], `${p.id} place source`).toContain(p.place_source);
      else expect(p.place_source ?? "", p.id).toBe("");
      expect(placeLine(p) === "" || placeLine(p).startsWith("Photo from ")).toBe(true);
    }
  });
  it("matches the credits file and stores no photo files in the repo", () => {
    const credits = readFileSync(new URL("../../design/image-credits.md", import.meta.url), "utf8");
    for (const p of approved) expect(credits, p.id).toContain(p.source_url);
    const pub = readdirSync(new URL("../public/", import.meta.url));
    expect(pub.filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f))).toEqual([]);
    expect(existsSync(new URL("../public/art", import.meta.url))).toBe(false);
  });
});

describe("choosing a photo (random, seeded)", () => {
  const pool = photosFor("weather");
  it("covers every photo of the pool over many draws", () => {
    const r = mulberry32(3);
    const seen = new Set(Array.from({ length: 400 }, () => pickPhoto(pool, r)!.id));
    expect(seen.size).toBe(pool.length);
  });
  it("is reproducible for a seed and differs across seeds", () => {
    expect(pickPhoto(pool, mulberry32(8))!.id).toBe(pickPhoto(pool, mulberry32(8))!.id);
    expect(new Set(Array.from({ length: 30 }, (_, s) => pickPhoto(pool, mulberry32(s + 1))!.id)).size).toBeGreaterThan(3);
  });
  it("never repeats the previous photo when there is a choice", () => {
    const r = mulberry32(2);
    for (let i = 0; i < 300; i++) expect(pickPhoto(pool, r, pool[0].id)!.id).not.toBe(pool[0].id);
  });
  it("copes with an empty or one-photo pool", () => {
    expect(pickPhoto([], mulberry32(1))).toBeNull();
    expect(pickPhoto([pool[0]], mulberry32(1), pool[0].id)!.id).toBe(pool[0].id);
  });
});
