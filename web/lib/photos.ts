// The curated scene photos (web/data/scene-photos.json): links to Wikimedia Commons, not files in the repo.
import raw from "@/data/scene-photos.json";
import type { SceneId } from "./scenes";

export interface ScenePhoto {
  id: string;
  scene: SceneId;
  provider: string;
  title: string;
  file: string; // file name on Commons, with underscores
  alt: string;
  place: string; // only what the photo's own source text states, or ""
  author: string;
  licence: string;
  licence_url: string;
  source_url: string;
  image_url: string;
  width: number;
  height: number;
  quality: boolean;
  approved: boolean;
}

export const ALL_PHOTOS = raw as ScenePhoto[];
export const ALLOWED_LICENCE = /^(CC0|PDM|CC BY(-SA)? [0-9.]+)$/;
export const ALLOWED_HOSTS = ["commons.wikimedia.org", "upload.wikimedia.org"];
/** Wikimedia only serves hotlinked thumbnails at standard widths; these two are standard. */
export const WIDTHS = [960, 1280] as const;

/** A width-limited URL (Special:FilePath redirects to the thumbnail on upload.wikimedia.org). */
export const photoUrl = (p: ScenePhoto, width: (typeof WIDTHS)[number] = 960) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(p.file)}?width=${width}`;

export const photosFor = (scene: SceneId, all: ScenePhoto[] = ALL_PHOTOS) => all.filter((p) => p.scene === scene && p.approved);

/** One random photo of the pool, never the previous one when there is a choice. */
export function pickPhoto(pool: ScenePhoto[], rng: () => number, excludeId?: string): ScenePhoto | null {
  const choices = pool.length > 1 ? pool.filter((p) => p.id !== excludeId) : pool;
  if (!choices.length) return null;
  return choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
}

/** The caption's place line, only from the photo's own source text. */
export const placeLine = (p: ScenePhoto) => (p.place ? `Photo from ${p.place}` : "");
