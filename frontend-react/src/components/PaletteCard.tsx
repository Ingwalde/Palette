import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { Palette } from "../types/api";
import { palettePath } from "../lib/palettePath";
import { copyToClipboard, formatColor, getPaletteContrastStatus } from "../lib/color";
import { useColorFormat } from "./ColorFormatContext";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useToggleFavorite } from "../api/hooks";
import { useToast } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";
import * as styles from "./PaletteCard.css";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";

export function PaletteCard({ palette }: { palette: Palette }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { format } = useColorFormat();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);
  // Holds the 1800 ms reveal timer so unmounting mid-reveal clears it instead of leaving a
  // setState to fire against a component that is gone.
  const revealTimer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(revealTimer.current), []);

  const contrast = useMemo(
    () => getPaletteContrastStatus(palette.colors),
    [palette.colors],
  );
  const saved = useMemo(
    () => (favorites ?? []).some((p) => p.slug === palette.slug),
    [favorites, palette.slug],
  );

  // navigator.clipboard.writeText rejects when the write is refused — a permission the user
  // declined, a page that lost focus, an insecure origin. Both call sites got that wrong in
  // opposite directions: copying a swatch awaited the promise and so showed nothing at all
  // while raising an unhandled rejection into the error reporter, and copying the name did not
  // await it and so announced success either way. Neither told the user the truth.
  const copy = async (text: string, success: string) => {
    try {
      await copyToClipboard(text);
      showToast(success);
    } catch {
      showToast("Could not copy to the clipboard", "error");
    }
  };

  const copyColor = async (color: string) => {
    setRevealed(color);
    window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(
      () => setRevealed((c) => (c === color ? null : c)),
      1800,
    );
    const shown = formatColor(color, format);
    await copy(shown, `${shown} copied`);
  };

  const onToggleFavorite = () => {
    if (!isAuthenticated) {
      // Carry the intent to the login page rather than dying in a toast: after signing in the
      // visitor lands back where they were and presses Save themselves (saving it for them
      // unasked would be writing to their account without consent).
      navigate("/login", { state: { from: location } });
      return;
    }
    toggleFavorite.mutate(
      { slug: palette.slug, saved, palette },
      {
        onSuccess: () =>
          showToast(saved ? "Removed from favorites" : "Added to favorites"),
        onError: (error) =>
          showToast(
            error instanceof ApiError ? error.message : "Something went wrong",
            "error",
          ),
      },
    );
  };

  return (
    <article className={styles.card} data-palette-id={palette.slug}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            <Link
              to={palettePath(palette)}
              state={{ from: location.search }}
              className={styles.titleLink}
            >
              {palette.name}
            </Link>
          </h3>
          <p className={styles.meta}>{palette.description}</p>
        </div>
        <button
          type="button"
          className={`${buttonClass("ghost")}${saved ? ` ${ui.buttonVariant.saved}` : ""}`}
          aria-label="Toggle favorite"
          aria-pressed={saved}
          disabled={toggleFavorite.isPending}
          onClick={onToggleFavorite}
        >
          {saved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <div className={styles.colors} role="group" aria-label={`${palette.name} colors`}>
        {palette.colors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            type="button"
            className={`${styles.swatch}${revealed === color ? ` ${styles.swatchRevealed}` : ""}`}
            style={{ "--swatch-color": color } as CSSProperties}
            data-color={formatColor(color, format)}
            aria-label={`Copy ${formatColor(color, format)}`}
            onClick={() => void copyColor(color)}
          />
        ))}
      </div>

      <div className={styles.tags}>
        {palette.tags.map((tag) => (
          <span key={tag} className={ui.tag}>
            #{tag}
          </span>
        ))}
      </div>

      <div className={styles.footer}>
        <Link
          to={`${palettePath(palette)}#contrast`}
          className={styles.contrastBadge}
          title={`Between ${contrast.darkest} and ${contrast.lightest}, the darkest and lightest colors.`}
        >
          {contrast.label} · {contrast.ratio}:1
          <span className={ui.visuallyHidden}>
            {` — between ${contrast.darkest} and ${contrast.lightest}, the darkest and lightest colors`}
          </span>
        </Link>
        <button
          type="button"
          className={buttonClass("ghost")}
          onClick={() =>
            void copy(
              palette.colors.join(", "),
              `${palette.colors.length} color${palette.colors.length === 1 ? "" : "s"} copied`,
            )
          }
        >
          Copy all
        </button>
      </div>
    </article>
  );
}
