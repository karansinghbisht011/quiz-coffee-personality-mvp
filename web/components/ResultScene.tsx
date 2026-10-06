"use client";

import { useEffect, useState } from "react";
import { photoUrl, type ScenePhoto } from "@/lib/photos";
import { sceneById, type Character, type SceneId } from "@/lib/scenes";
import Caricature from "./Caricature";
import DoodleLoader from "./DoodleLoader";
import FallbackScene from "./FallbackScene";
import PhotoCredit from "./PhotoCredit";

export const PHOTO_TIMEOUT_MS = 6000;

// The scene frame: doodle loader while the photo loads, the photo with our caricature on top, or (if the
// photo fails, is blocked, takes over 6 s, or none is approved) a drawn fallback scene. Fixed aspect ratio, so
// nothing jumps when the photo arrives. Remount with a new `key` for a new photo.
export default function ResultScene({ scene, photo, character }: { scene: SceneId; photo: ScenePhoto | null; character: Character }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(photo ? "loading" : "failed");
  useEffect(() => {
    if (!photo) return;
    const id = setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), PHOTO_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [photo]);
  const s = sceneById(scene);
  const show = photo && status !== "failed";
  return (
    <>
      <div className="result-art" data-status={status} data-scene={scene}>
        {show && (
          // eslint-disable-next-line @next/next/no-img-element -- hotlinked from Wikimedia at a standard width; next/image would proxy it
          <img className={`scene-photo ${status === "loaded" ? "on" : ""}`} src={photoUrl(photo, 960)} alt={photo.alt} width={960} height={Math.round((960 * photo.height) / photo.width)} decoding="async" referrerPolicy="no-referrer"
            onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")} />
        )}
        {status === "failed" && <FallbackScene scene={scene} />}
        {status === "loading" && <DoodleLoader />}
        <span className="scene-title">{s.title}</span>
        <Caricature character={character} scene={scene} />
      </div>
      {status === "loaded" && photo ? <PhotoCredit photo={photo} /> : null}
    </>
  );
}
