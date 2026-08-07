import { useMemo, useState } from "react";
import type { Palette } from "../types/api";
import { copyToClipboard, getPaletteContrastStatus } from "../lib/color";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useToggleFavorite } from "../api/hooks";
import { useToast } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";
import styles from "./PaletteCard.module.css";

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

  const copyColor = async (color: string) => {
    setRevealed(color);
    window.setTimeout(() => setRevealed((c) => (c === color ? null : c)), 1800);
    await copyToClipboard(color);
    showToast(`${color} copied`);
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
    <article className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{palette.name}</h3>
          <p className={styles.meta}>{palette.description}</p>
        </div>
        <button
          type="button"
          className={`${styles.fav} ${saved ? styles.favSaved : ""}`}
          onClick={onToggleFavorite}
          disabled={toggleFavorite.isPending}
          aria-pressed={saved}
        >
          {saved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <div className={styles.colors} aria-label={`${palette.name} colors`}>
        {palette.colors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            type="button"
            className={styles.swatch}
            style={{ background: color }}
            aria-label={`Copy ${color}`}
            onClick={() => void copyColor(color)}
          >
            <span
              className={`${styles.swatchHex} ${revealed === color ? styles.swatchHexShown : ""}`}
            >
              {color}
            </span>
          </button>
        ))}
      </div>

      {palette.tags.length > 0 && (
        <div className={styles.tags}>
          {palette.tags.map((tag) => (
            <span key={tag} className={styles.tag}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <span className={styles.badge}>
          {contrast.label} · {contrast.ratio}:1
        </span>
        <button
          type="button"
          className={styles.copyName}
          onClick={() => {
            void copyToClipboard(palette.name);
            showToast(`Palette name copied: ${palette.name}`);
          }}
        >
          Copy name
        </button>
      </div>
    </article>
  );
}
