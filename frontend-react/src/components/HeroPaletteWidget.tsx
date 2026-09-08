import type { CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { palettePath } from "../lib/palettePath";
import { CURATOR_HANDLE } from "../lib/constants";
import {
  formatContrastRatio,
  getPaletteContrastStatus,
  readableTextOn,
} from "../lib/color";
import { buttonClass } from "../styles/ui";
import type { Palette } from "../types/api";
import * as styles from "./HeroPaletteWidget.css";

interface Props {
  palette: Palette;
  onShuffle: () => void;
}

/** The hero's live proof: a real featured palette. The card links to the palette; hovering or
 * focusing it reveals each swatch's hex and the contrast grade, and Shuffle draws another. */
export function HeroPaletteWidget({ palette, onShuffle }: Props) {
  const location = useLocation();
  const contrast = getPaletteContrastStatus(palette.colors);
  const colors = palette.colors.slice(0, 6);
  const ownerLabel =
    palette.owner_handle === CURATOR_HANDLE ? "Palette" : palette.owner_handle;

  return (
    <div className={styles.widget}>
      <Link
        to={palettePath(palette)}
        state={{ from: location.search }}
        className={styles.windowLink}
        aria-label={`Featured palette: ${palette.name} by ${ownerLabel}, ${contrast.label}`}
      >
        <span className={styles.badge}>
          {contrast.label} · {formatContrastRatio(contrast.ratio)}:1
        </span>
        <div
          className={styles.strip}
          style={{ "--count": colors.length } as CSSProperties}
        >
          {colors.map((color) => (
            <span
              key={color}
              className={styles.swatch}
              style={{ background: color, color: readableTextOn(color) } as CSSProperties}
            >
              <span className={styles.hex}>{color.toUpperCase()}</span>
            </span>
          ))}
        </div>
        <div className={styles.caption}>
          <span className={styles.name}>{palette.name}</span>
          <span className={styles.arrow} aria-hidden="true">
            View →
          </span>
        </div>
      </Link>
      <button
        type="button"
        className={`${buttonClass("secondary")} ${styles.shuffle}`}
        onClick={onShuffle}
      >
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
          <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
        </svg>
        Shuffle
      </button>
    </div>
  );
}
