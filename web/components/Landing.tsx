import CoffeePour from "./CoffeePour";
import LandingArt from "./LandingArt";

// `autocomplete="off"` is what stops Firefox restoring a form control's state on reload; React's button type does not list it
const NO_RESTORE = { autoComplete: "off" };

interface Props {
  onStart: () => void;
  ready: boolean;
  failed: boolean;
  cafeCount: number;
  coffeeCount: number;
}

export default function Landing({ onStart, ready, failed, cafeCount, coffeeCount }: Props) {
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="kicker">☔ Bengaluru personality science*</span>
        <h1 className="title">Which coffee is your Bengaluru alter ego?</h1>
        <p>
          Nine deeply scientific questions. Zero scientific validity. Your answers pick three real coffees, from three
          real Bengaluru cafes, that match who you are right now.
        </p>
        <div className="cta-row">
          {/* autoComplete="off": Firefox restores a button's enabled/disabled state on reload, which mismatches the server HTML;
              suppressHydrationWarning covers the rest, and start() itself refuses to run before the menus have loaded */}
          <button className="btn btn-primary" onClick={onStart} disabled={!ready} {...NO_RESTORE} suppressHydrationWarning>
            Find my coffee →
          </button>
          {!ready && !failed ? (
            <span className="loading-widget" role="status">
              <CoffeePour />
              <span className="sr-only">Loading the menus…</span>
            </span>
          ) : (
            <span className="cta-note">{failed ? "Could not load the menus. Please refresh." : "~60 seconds · no login · highly scientific"}</span>
          )}
        </div>
        <span className="scribble">*peer reviewed by an auto driver and one mildly opinionated barista</span>
        <div className="intro-grid" role="region" aria-label="About this quiz" tabIndex={0}>
          <div className="mini">
            <b>☕ Real menus</b> {ready ? `${fmt(coffeeCount)} coffees from ${fmt(cafeCount)} cafes` : "Hundreds of cafes, thousands of coffees"}
          </div>
          <div className="mini">
            <b>🌧️ Weather</b> Rain makes every answer more dramatic
          </div>
          <div className="mini">
            <b>🚇 Geography</b> Church Street, Indiranagar, Koramangala &amp; beyond
          </div>
        </div>
      </div>
      <div className="hero-art">
        <div className="sticker">VERY IMPORTANT QUIZ</div>
        <div className="kaapi-sign" aria-hidden="true">ಕಾಫಿ</div>
        <LandingArt />
      </div>
    </section>
  );
}
