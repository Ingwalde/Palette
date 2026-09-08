import { useEffect, useState, type CSSProperties } from "react";
import { usePalettes } from "../api/hooks";
import type { Palette } from "../types/api";
import * as ui from "../styles/ui.css";
import * as styles from "./HeroEditorial.css";

// Shown until the real palettes load, so the artwork is never blank on first paint.
const FALLBACK: Pick<Palette, "name" | "colors"> = {
  name: "Earth & air",
  colors: ["#D56F51", "#ECD9B9", "#697657", "#BFC8AE", "#30372F"],
};

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
 * The homepage hero — the approved "Editorial" composition, but its palette is a real one from the
 * catalogue rather than a fixed preset. The real header, navigation, auth and the catalogue below
 * are untouched; "Explore palettes" scrolls to the real `#palettes` anchor, and "Another
 * combination" picks another random published palette (from a small popular-sorted pool), driving
 * the artwork, the swatches, the print title and the HEX label from one piece of state.
 */
export function HeroEditorial() {
  const { data } = usePalettes({ sort: "popular", limit: 48 });
  // The artwork maps a palette onto five colour slots, so palettes with at least four colours read
  // best; the threshold also keeps the pick stable under the visual test's fixture (one qualifying
  // palette there) while production has a wide pool to draw a random one from.
  const pool = (data?.items ?? []).filter((p) => p.colors.length >= 4);

  const [current, setCurrent] = useState<Pick<Palette, "name" | "colors"> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // Pick a random palette once the pool arrives (a fresh mount shows a different one).
  useEffect(() => {
    if (!current && pool.length > 0) {
      setCurrent(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [current, pool]);

  const shown = current ?? FALLBACK;
  const colors = shown.colors;

  const cycle = () => {
    if (pool.length === 0) return;
    let pick = pool[Math.floor(Math.random() * pool.length)];
    // Avoid landing on the same palette twice in a row when there is a choice.
    if (pool.length > 1) {
      let guard = 0;
      while (pick.name === shown.name && guard < 8) {
        pick = pool[Math.floor(Math.random() * pool.length)];
        guard += 1;
      }
    }
    setCurrent(pick);
    setAnnouncement(`${pick.name} palette.`);
  };

  const swatchVars = {
    "--s0": colors[0 % colors.length],
    "--s1": colors[1 % colors.length],
    "--s2": colors[2 % colors.length],
    "--s3": colors[3 % colors.length],
    "--s4": colors[4 % colors.length],
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
            aria-label={`Abstract color composition — the ${shown.name} palette on overlapping printed swatches`}
          >
            <div className={styles.print}>
              <div className={styles.printArt}>
                <div className={styles.circle} />
                <div className={styles.archShape} />
                <div className={styles.square} />
              </div>
              <div className={styles.printTitle}>{shown.name}</div>
              <div className={styles.printCaption}>
                <span>Color study</span>
                <span>Palette</span>
              </div>
            </div>
            <div className={styles.chip}>
              <div className={styles.chipColor} />
              <span className={styles.chipHex}>{colors[0]}</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div
            className={styles.swatches}
            role="img"
            aria-label={`Colors in the ${shown.name} palette`}
          >
            {colors.slice(0, 5).map((color, i) => (
              <span key={i} style={{ background: color } as CSSProperties} />
            ))}
          </div>
          <span className={styles.bottomLabel}>A palette. A starting point.</span>
          <button type="button" className={styles.shuffle} onClick={cycle}>
            {ShuffleIcon} Another combination
          </button>
        </div>

        <p className={styles.srOnly} role="status" aria-live="polite">
          {announcement}
        </p>
      </div>
    </section>
  );
}
