import { franchiseMapsUrl, splitName } from "@/lib/display";
import type { Pick } from "@/lib/scoring";

export default function ResultCard({ pick }: { pick: Pick }) {
  const isFranchise = pick.cafe.maps_link === "Any";
  const mapsHref = isFranchise ? franchiseMapsUrl(pick.cafeName) : pick.cafe.maps_link;
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
        <a
          className="map-link"
          target="_blank"
          rel="noopener noreferrer"
          href={mapsHref}
          aria-label={isFranchise ? `Find all ${pick.cafeName} outlets in Google Maps` : `Open ${pick.cafeName} in Google Maps`}
        >
          <svg className="map-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M2 8.5 8 6l8 2.5 6-2.5v11l-6 2.5-8-2.5-6 2.5z" fill="#f1e2cc" stroke="#6b4a2f" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M8 6v11M16 8.5v11" stroke="#6b4a2f" strokeWidth="1.2" />
            <path d="M12 2.2a4.3 4.3 0 0 0-4.3 4.3c0 3.1 4.3 7.2 4.3 7.2s4.3-4.1 4.3-7.2A4.3 4.3 0 0 0 12 2.2z" fill="#d6443a" stroke="#fff" strokeWidth="1" />
            <circle cx="12" cy="6.5" r="1.6" fill="#fff" />
          </svg>
          {isFranchise ? "All outlets" : "Open in Maps"}
        </a>
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
