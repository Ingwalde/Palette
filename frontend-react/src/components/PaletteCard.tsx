import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Palette } from "../types/api";
import { palettePath } from "../lib/palettePath";
import { tagPath } from "../lib/catalogParams";
import { CURATOR_HANDLE } from "../lib/constants";
import { API_BASE_URL } from "../lib/apiBase";
import { copyToClipboard, formatColor } from "../lib/color";
import { useColorFormat } from "./ColorFormatContext";
import { useSavePalette } from "./useSavePalette";
import { useToast } from "./toast/ToastProvider";
import * as styles from "./PaletteCard.css";

export function PaletteCard({ palette }: { palette: Palette }) {
  const location = useLocation();
  const { format } = useColorFormat();
  const { saved, pending, toggle } = useSavePalette(palette);
  const { showToast } = useToast();
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const tagsId = useId();
  const revealTimer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(revealTimer.current), []);
  const handle = palette.owner_handle || CURATOR_HANDLE;
  const isCurator = handle === CURATOR_HANDLE;
  const visibleColor = activeColor ?? copiedColor;

  const copy = async (text: string, success: string) => {
    try {
      await copyToClipboard(text);
      showToast(success);
      return true;
    } catch {
      showToast("Could not copy to the clipboard", "error");
      return false;
    }
  };
  const copyColor = async (color: string) => {
    const shown = formatColor(color, format);
    if (await copy(shown, `${shown} copied`)) {
      setCopiedColor(color);
      window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => setCopiedColor(null), 1800);
    }
  };
  const renderTag = (tag: string) => (
    <Link
      key={tag}
      to={tagPath(tag, location.pathname, location.search)}
      className={styles.tag}
    >
      #{tag}
    </Link>
  );
  return (
    <article className={styles.card} data-palette-id={palette.slug}>
      <div
        className={styles.colors}
        role="group"
        aria-label={`${palette.name} colors`}
        onMouseLeave={() => setActiveColor(null)}
      >
        {palette.colors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            type="button"
            className={styles.swatch}
            style={{ "--swatch-color": color } as CSSProperties}
            data-color={formatColor(color, format)}
            aria-label={`Copy ${formatColor(color, format)}`}
            onMouseEnter={() => setActiveColor(color)}
            onFocus={() => setActiveColor(color)}
            onBlur={() => setActiveColor(null)}
            onClick={() => void copyColor(color)}
          />
        ))}
        {visibleColor && (
          <span className={styles.colorLabel} aria-hidden="true">
            {formatColor(visibleColor, format)}
            {visibleColor === copiedColor ? " · Copied" : ""}
          </span>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Link
              to={palettePath(palette)}
              state={{ from: location.search }}
              className={styles.titleLink}
            >
              {palette.name}
            </Link>
          </h3>
          <button
            type="button"
            className={`${styles.save}${saved ? ` ${styles.saved}` : ""}`}
            aria-label={`${saved ? "Unsave" : "Save"} ${palette.name}`}
            aria-pressed={saved}
            disabled={pending}
            onClick={toggle}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill={saved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
            </svg>
            {saved ? "Saved" : "Save"}
          </button>
        </div>
        <div className={styles.authorRow}>
          {!isCurator && palette.owner_has_avatar ? (
            <img
              className={styles.authorAvatar}
              src={`${API_BASE_URL}/users/${encodeURIComponent(handle)}/avatar`}
              alt=""
              loading="lazy"
            />
          ) : (
            <span className={styles.authorMark} aria-hidden="true">
              {isCurator ? "P" : handle.charAt(0).toUpperCase()}
            </span>
          )}
          {isCurator ? (
            <span className={styles.authorName}>Palette</span>
          ) : (
            <Link className={styles.authorLink} to={`/u/${encodeURIComponent(handle)}`}>
              @{handle}
            </Link>
          )}
          <span className={styles.colorCount}>
            {palette.colors.length} {palette.colors.length === 1 ? "color" : "colors"}
          </span>
        </div>
        <div className={styles.footer}>
          <div className={styles.tags}>
            {palette.tags.slice(0, 2).map(renderTag)}
            {palette.tags.length > 2 && (
              <button
                type="button"
                className={styles.moreTags}
                aria-label={`${showTags ? "Hide" : "Show"} more tags for ${palette.name}`}
                aria-expanded={showTags}
                aria-controls={tagsId}
                onClick={() => setShowTags((v) => !v)}
              >
                {showTags ? "Less" : `+${palette.tags.length - 2}`}
              </button>
            )}
          </div>
          <button
            type="button"
            className={styles.copy}
            onClick={() =>
              void copy(
                palette.colors.map((c) => formatColor(c, format)).join(", "),
                `${palette.colors.length} ${palette.colors.length === 1 ? "color" : "colors"} copied`,
              )
            }
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
            </svg>
            Copy all
          </button>
        </div>
        {palette.tags.length > 2 && (
          <div id={tagsId} className={styles.extraTags} hidden={!showTags}>
            {palette.tags.slice(2).map(renderTag)}
          </div>
        )}
      </div>
    </article>
  );
}
