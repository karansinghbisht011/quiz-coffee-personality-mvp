import { splitName } from "@/lib/display";
import type { Pick } from "@/lib/scoring";

export default function ResultCard({ pick }: { pick: Pick }) {
  const hasMap = pick.cafe.maps_link && pick.cafe.maps_link !== "Any";
  const cafe = splitName(pick.cafeName);
  const tags = [...pick.coffeeTags.map((t) => ({ t, kind: "coffee" })), ...pick.cafeTags.map((t) => ({ t, kind: "cafe" }))];
  return (
    <article className="result-card" data-slot={pick.slot}>
      <div className="card-top">
        <span className={`rank ${pick.slot === 1 ? "" : "plain"}`}>
          {pick.slot === 1 ? "☕ " : ""}
          {pick.label.toUpperCase()}
        </span>
        {tags.length > 0 && (
          <div className="chips">
            {tags.map(({ t, kind }) => (
              <span key={`${kind}-${t}`} className={`chip ${kind === "cafe" ? "cafe" : ""}`}>
                {t}
              </span>
            ))}
          </div>
        )}
        {hasMap ? (
          <a className="map-link" target="_blank" rel="noopener noreferrer" href={pick.cafe.maps_link} aria-label={`Open ${pick.cafeName} in Google Maps`}>
            Maps ↗
          </a>
        ) : (
          <span className="any-note">Every outlet</span>
        )}
      </div>
      <h3 className="coffee-name" title={pick.coffee.name}>
        {pick.coffee.name}
      </h3>
      <p className="at-cafe" title={pick.cafeName}>
        <span aria-hidden="true">📍</span>
        <span className="cafe-text">
          <b className="cafe-main">{cafe.main}</b>
          {cafe.sub && <span className="cafe-sub">{cafe.sub}</span>}
        </span>
      </p>
      <p className="why">
        <strong>Why this is you:</strong> {pick.reason}
      </p>
    </article>
  );
}
