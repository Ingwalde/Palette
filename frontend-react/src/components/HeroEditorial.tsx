import { useState, type CSSProperties } from "react";
import * as ui from "../styles/ui.css";
import * as styles from "./HeroEditorial.css";

// The three illustrative hero presets from the approved handoff. Decorative only — they never touch
// the database or the real catalogue; "Another combination" cycles through them in order and wraps.
interface Preset {
  name: string;
  colors: readonly [string, string, string, string, string];
}

const PRESETS: readonly Preset[] = [
  {
    name: "Earth & air",
    colors: ["#D56F51", "#ECD9B9", "#697657", "#BFC8AE", "#30372F"],
  },
  { name: "Sea & sky", colors: ["#C7D9EB", "#EADAD4", "#607F97", "#ADC5BD", "#304349"] },
  {
    name: "Wine & roses",
    colors: ["#A95D70", "#F1DFCA", "#7C6B89", "#C8B7C7", "#3E2D37"],
  },
];

const ArrowUpRight = (
  <svg
    className={styles.primaryIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

const ShuffleIcon = (
  <svg
    className={styles.shuffleIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m18 14 4 4-4 4" />
    <path d="m18 2 4 4-4 4" />
    <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
    <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
    <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
  </svg>
);

/**
 * The homepage hero — concept 02 "Editorial" from the approved design handoff. The real header,
 * navigation, auth and the catalogue below are untouched; this replaces only the hero band.
 * "Explore palettes" scrolls to the real catalogue (`#palettes`); "Another combination" cycles the
 * decorative preset that drives the artwork, the five swatches, the print title and the HEX label
 * from one piece of state.
 */
export function HeroEditorial() {
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const preset = PRESETS[index];

  const cycle = () => {
    const nextIndex = (index + 1) % PRESETS.length;
    setIndex(nextIndex);
    setAnnouncement(`${PRESETS[nextIndex].name} palette.`);
  };

  const swatchVars = {
    "--s0": preset.colors[0],
    "--s1": preset.colors[1],
    "--s2": preset.colors[2],
    "--s3": preset.colors[3],
    "--s4": preset.colors[4],
  } as CSSProperties;

  return (
    <section className={`${ui.section} ${styles.heroWrap}`} aria-labelledby="hero-title">
      <div className={styles.hero} style={swatchVars}>
        <div className={styles.grid}>
          <div>
            <p className={styles.eyebrow}>For the love of color</p>
            <h1 id="hero-title" className={styles.heading}>
              Color with
              <em className={styles.headingItalic}>character.</em>
            </h1>
            <p className={styles.copy}>
              Unexpected combinations. Beautiful beginnings. Find the colors for whatever
              comes next.
            </p>
            <div className={styles.actions}>
              <a className={styles.primary} href="#palettes">
                Explore palettes {ArrowUpRight}
              </a>
            </div>
          </div>

          <div
            className={styles.stage}
            role="img"
            aria-label={`Abstract color composition — the ${preset.name} palette on overlapping printed swatches`}
          >
            <div className={styles.print}>
              <div className={styles.printArt}>
                <div className={styles.circle} />
                <div className={styles.archShape} />
                <div className={styles.square} />
              </div>
              <div className={styles.printTitle}>{preset.name}</div>
              <div className={styles.printCaption}>
                <span>Color study</span>
                <span>Palette</span>
              </div>
            </div>
            <div className={styles.chip}>
              <div className={styles.chipColor} />
              <span className={styles.chipHex}>{preset.colors[0]}</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div
            className={styles.swatches}
            role="img"
            aria-label={`Five colors in the ${preset.name} palette`}
          >
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <span className={styles.bottomLabel}>A palette. A starting point.</span>
          <button type="button" className={styles.shuffle} onClick={cycle}>
            {ShuffleIcon} Another combination
          </button>
        </div>

        <div className={styles.featureRow}>
          <span>Find your next palette.</span>
          <span>
            <span>Save</span>
            <span>Check contrast</span>
            <span>Export</span>
          </span>
        </div>

        <p className={styles.srOnly} role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
