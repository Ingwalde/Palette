import { useMemo, useState, type CSSProperties } from "react";
import type { Palette } from "../types/api";
import { copyToClipboard, getPaletteContrastStatus } from "../lib/color";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useToggleFavorite } from "../api/hooks";
import { useToast } from "./toast/ToastProvider";
import { ApiError } from "../lib/http";

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
    <article className="palette-card" data-palette-id={palette.slug}>
      <div className="palette-card__header">
        <div>
          <h3 className="palette-card__title">{palette.name}</h3>
          <p className="palette-card__meta">{palette.description}</p>
        </div>
        <button
          type="button"
          className={`button button--ghost${saved ? " button--saved" : ""}`}
          aria-label="Toggle favorite"
          aria-pressed={saved}
          disabled={toggleFavorite.isPending}
          onClick={onToggleFavorite}
        >
          {saved ? "♥ Saved" : "♡ Save"}
        </button>
      </div>

      <div className="palette-card__colors" aria-label={`${palette.name} colors`}>
        {palette.colors.map((color, i) => (
          <button
            key={`${color}-${i}`}
            type="button"
            className={`color-swatch${revealed === color ? " color-swatch--revealed" : ""}`}
            style={{ "--swatch-color": color } as CSSProperties}
            data-color={color}
            aria-label={`Copy ${color}`}
            onClick={() => void copyColor(color)}
          />
        ))}
      </div>

      <div className="palette-card__tags">
        {palette.tags.map((tag) => (
          <span key={tag} className="tag">
            #{tag}
          </span>
        ))}
      </div>

      <div className="palette-card__footer">
        <span className="contrast-badge">
          {contrast.label} · {contrast.ratio}:1
        </span>
        <button
          type="button"
          className="button button--ghost"
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
