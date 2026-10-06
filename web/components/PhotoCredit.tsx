import { placeLine, type ScenePhoto } from "@/lib/photos";

// The credit under every photo: author, licence, source, with links (CC licences require it).
export default function PhotoCredit({ photo }: { photo: ScenePhoto }) {
  const place = placeLine(photo);
  return (
    <p className="photo-credit">
      {place && <span>{place}. </span>}
      <span>Photo: {photo.author || "unknown author"}, </span>
      <a href={photo.licence_url} target="_blank" rel="noopener noreferrer">{photo.licence}</a>
      <span>, via </span>
      <a href={photo.source_url} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
      <span>. Colours adjusted for display.</span>
    </p>
  );
}
