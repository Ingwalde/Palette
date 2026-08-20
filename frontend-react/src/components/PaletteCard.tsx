import { useMemo, useState, type CSSProperties } from "react";
import type { Palette } from "../types/api";
import { copyToClipboard, getPaletteContrastStatus } from "../lib/color";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useToggleFavorite } from "../api/hooks";
import { useToast } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";
import * as styles from "./PaletteCard.css";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";

export function PaletteCard({ palette }: { palette: Palette }) {
  const { isAuthenticated } = useAuth();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);

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
    window.setTimeout(() => setRevealed((c) => (c === color ? null : c)), 1800);
    await copy(color, `${color} copied`);
  };

  const onToggleFavorite = () => {
    if (!isAuthenticated) {
      showToast("Log in to save favorites");
      return;
    }
    toggleFavorite.mutate(
      { slug: palette.slug, saved },
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
          <h3 className={styles.title}>{palette.name}</h3>
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
            data-color={color}
            aria-label={`Copy ${color}`}
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
        <span className={styles.contrastBadge}>
          {contrast.label} · {contrast.ratio}:1
        </span>
        <button
          type="button"
          className={buttonClass("ghost")}
          onClick={() => void copy(palette.name, `Palette name copied: ${palette.name}`)}
        >
          Copy name
        </button>
      </div>
    </article>
  );
}
