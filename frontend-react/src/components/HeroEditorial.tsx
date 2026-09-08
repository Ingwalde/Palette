import { useState, type CSSProperties } from "react";
import * as ui from "../styles/ui.css";
import * as styles from "./HeroEditorial.css";
import { createHeroScene, TEMPLATES, type HeroScene } from "./heroScene";

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

// A double chevron pointing at the catalogue below the fold.
const ChevronsDown = (
  <svg
    className={styles.observeIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m7 6 5 5 5-5" />
    <path d="m7 13 5 5 5-5" />
  </svg>
);

/** The artwork field — one of the ten approved compositions, drawn from the scene's colours. */
function Artwork({ scene }: { scene: HeroScene }) {
  const template = TEMPLATES[scene.count][scene.variant === "A" ? 0 : 1];
  return (
    // The art field keeps the approved 1.18 aspect ratio so circles stay circular; the paper card
    // around it fills any spare space with the same background colour.
    <div
      className={styles.artField}
      style={{ background: scene.colors[0] } as CSSProperties}
    >
      {template.shapes.map(([colorIndex, x, y, w, h, radius], i) => (
        <span
          key={i}
          className={styles.shape}
          style={
            {
              background: scene.colors[colorIndex],
              left: `${x}%`,
              top: `${y}%`,
              width: `${w}%`,
              height: `${h}%`,
              borderRadius: radius,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/**
 * The homepage hero — the approved "Editorial" composition (02). On every visit it picks, at
 * random and independently, a colour count (2–6), a palette of that size, and one of the two
 * approved artworks for that count. The real header, navigation, auth and the catalogue below are
 * untouched; "Explore palettes" scrolls to the real `#palettes` anchor, and "Another combination"
 * re-rolls all three choices. Ordinary re-renders, theme changes, resize and catalogue work keep
 * the current scene; only a fresh visit or the button changes it.
 */
export function HeroEditorial() {
  // Lazy initialiser: one scene per mount. React Router remounts HomePage on a fresh entry, so a
  // new visit re-rolls; ordinary re-renders and theme changes reuse the stored scene.
  const [scene, setScene] = useState<HeroScene>(() => createHeroScene(Math.random));
  const [announcement, setAnnouncement] = useState("");

  const cycle = () => {
    const next = createHeroScene(Math.random);
    setScene(next);
    setAnnouncement(`${next.paletteName} palette, ${next.count} colours.`);
  };

  const { colors, paletteName, count } = scene;
  const chip = colors[1];

  return (
    <section className={`${ui.section} ${styles.heroWrap}`} aria-labelledby="hero-title">
      <div className={styles.hero}>
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
            aria-label={`Abstract color composition — the ${paletteName} palette, ${count} colors`}
          >
            <div className={styles.print}>
              <div className={styles.printArt}>
                <Artwork scene={scene} />
              </div>
              <div className={styles.printTitle}>{paletteName}</div>
              <div className={styles.printCaption}>
                <span>Color study</span>
                <span>Palette</span>
              </div>
            </div>
            <div className={styles.chip}>
              <div
                className={styles.chipColor}
                style={{ background: chip } as CSSProperties}
              />
              <span className={styles.chipHex}>{chip}</span>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <div
            className={styles.swatches}
            role="img"
            aria-label={`Colors in the ${paletteName} palette`}
          >
            {colors.map((color, i) => (
              <span key={i} style={{ background: color } as CSSProperties} />
            ))}
          </div>
          <a className={styles.bottomLabel} href="#palettes">
            Observe {ChevronsDown}
          </a>
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
