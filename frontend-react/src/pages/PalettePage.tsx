import { useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePalette, usePalettes, useFavorites, useToggleFavorite } from "../api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { PaletteCard } from "../components/PaletteCard";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/http";
import { CURATOR_HANDLE } from "../lib/constants";
import { palettePath } from "../lib/palettePath";
import { forkPalette } from "../api/palettes";
import { reportPalette } from "../api/reports";
import { useModal } from "../components/modal/ModalProvider";
import {
  copyToClipboard,
  formatColor,
  getContrastMatrix,
  readableTextOn,
  toHslString,
  toRgbString,
} from "../lib/color";
import { useColorFormat } from "../components/ColorFormatContext";
import { generateExportText } from "../lib/exportGenerators";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./PalettePage.css";

export function PalettePage() {
  const { handle = "", slug = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useModal();
  const { format } = useColorFormat();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const [forking, setForking] = useState(false);

  const { data: palette, isLoading, error } = usePalette(handle, slug);

  // The "similar" query keys off the first tag; it runs regardless, but the section only renders
  // when there is a tag and at least one other palette to show.
  const firstTag = palette?.tags[0];
  const { data: similar } = usePalettes(
    firstTag ? { tag: firstTag, limit: 4 } : { limit: 4 },
  );

  const matrix = useMemo(
    () => (palette ? getContrastMatrix(palette.colors) : []),
    [palette],
  );

  // Where "All palettes" returns to: the card passes the visitor's own query string through
  // router state, so they land back on their filtered catalogue rather than a bare home page.
  const from = (location.state as { from?: string } | null)?.from;
  const backTo = from ? `/${from}` : "/";

  if (error instanceof ApiError && error.status === 404) {
    return (
      <section className={ui.section}>
        <EmptyState
          title="Palette not found"
          text="This palette may have been renamed or removed."
          action={{ label: "Back to all palettes", to: "/" }}
        />
      </section>
    );
  }

  if (error) {
    return (
      <section className={ui.section}>
        <EmptyState
          title="Couldn't load this palette"
          text="Check your connection and try again."
          action={{ label: "Back to all palettes", to: "/" }}
        />
      </section>
    );
  }

  if (isLoading || !palette) {
    return (
      <section className={ui.section}>
        <p className={ui.muted} role="status">
          Loading palette…
        </p>
      </section>
    );
  }

  const saved = (favorites ?? []).some((p) => p.slug === palette.slug);
  const ownerLabel =
    palette.owner_handle === CURATOR_HANDLE ? "Palette" : palette.owner_handle;
  const similarPalettes = (similar?.items ?? [])
    .filter((p) => p.slug !== palette.slug)
    .slice(0, 3);

  const copyValue = async (text: string, success: string) => {
    try {
      await copyToClipboard(text);
      showToast(success);
    } catch {
      showToast("Could not copy to the clipboard", "error");
    }
  };

  const onSave = () => {
    if (!isAuthenticated) {
      showToast("Log in to save favorites");
      return;
    }
    toggleFavorite.mutate(
      { slug: palette.slug, saved, palette },
      {
        onSuccess: () =>
          showToast(saved ? "Removed from favorites" : "Added to favorites"),
        onError: (e) =>
          showToast(e instanceof ApiError ? e.message : "Something went wrong", "error"),
      },
    );
  };

  const onShare = () =>
    void copyValue(window.location.href, "Link copied to the clipboard");

  const isOwner = user?.username === palette.owner_handle;

  const onReport = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    const ok = await confirm({
      title: "Report this palette?",
      message: "Send it to the moderators for review.",
      confirmLabel: "Report",
    });
    if (!ok) return;
    try {
      await reportPalette(palette.id, "other");
      showToast("Reported for review");
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Something went wrong", "error");
    }
  };

  const onFork = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location } });
      return;
    }
    if (forking) return;
    setForking(true);
    try {
      const copy = await forkPalette(palette.id);
      showToast("Forked to your palettes");
      queryClient.invalidateQueries({ queryKey: ["palettes"] });
      navigate(`${palettePath(copy)}/edit`);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Something went wrong", "error");
      setForking(false);
    }
  };

  return (
    <>
      <section className={`${ui.section} ${styles.head}`}>
        <Link to={backTo} className={styles.backLink}>
          ← All palettes
        </Link>

        <h1 className={styles.title}>{palette.name}</h1>
        {palette.description && (
          <p className={styles.description}>{palette.description}</p>
        )}
        <p className={styles.byline}>
          By <span className={styles.owner}>{ownerLabel}</span>
        </p>

        {palette.status === "removed" && (
          <p className={styles.removed} role="status">
            This palette was removed by moderation. Only you can see it.
          </p>
        )}

        {palette.forked_from && (
          <p className={styles.byline}>
            Forked from{" "}
            <Link className={styles.owner} to={palettePath(palette.forked_from)}>
              {palette.forked_from.name}
            </Link>{" "}
            by {palette.forked_from.owner_handle}
          </p>
        )}

        {palette.tags.length > 0 && (
          <div className={styles.tags}>
            {palette.tags.map((tag) => (
              <Link key={tag} to={`/?tag=${encodeURIComponent(tag)}`} className={ui.tag}>
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={`${ui.section} ${styles.colorsSection}`} aria-label="Colors">
        <div className={styles.colors}>
          {palette.colors.map((color, i) => {
            return (
              <button
                key={`${color}-${i}`}
                type="button"
                className={styles.colorBlock}
                style={
                  {
                    background: color,
                    color: readableTextOn(color),
                  } as CSSProperties
                }
                onClick={() => {
                  const shown = formatColor(color, format);
                  void copyValue(shown, `${shown} copied`);
                }}
                aria-label={`Copy ${formatColor(color, format)}`}
              >
                <span className={styles.colorHex}>{color}</span>
                <span className={styles.colorAlt}>{toRgbString(color)}</span>
                <span className={styles.colorAlt}>{toHslString(color)}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${buttonClass("primary")}${saved ? ` ${ui.buttonVariant.saved}` : ""}`}
            aria-pressed={saved}
            disabled={toggleFavorite.isPending}
            onClick={onSave}
          >
            {saved ? "♥ Saved" : "♡ Save"}
          </button>
          <button
            type="button"
            className={buttonClass("secondary")}
            onClick={() => void copyValue(palette.colors.join(", "), "All colors copied")}
          >
            Copy all
          </button>
          <button
            type="button"
            className={buttonClass("secondary")}
            onClick={() =>
              void copyValue(generateExportText([palette], "css"), "CSS copied")
            }
          >
            Copy CSS
          </button>
          <button
            type="button"
            className={buttonClass("secondary")}
            disabled={forking}
            onClick={() => void onFork()}
          >
            {forking ? "Forking…" : "Fork"}
          </button>
          <button type="button" className={buttonClass("ghost")} onClick={onShare}>
            Share
          </button>
          {!isOwner && (
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => void onReport()}
            >
              Report
            </button>
          )}
        </div>
      </section>

      <section
        className={`${ui.section} ${styles.contrastSection}`}
        id="contrast"
        aria-labelledby="contrast-title"
      >
        <div className={ui.sectionHeading}>
          <div>
            <p className={ui.eyebrow}>Accessibility</p>
            <h2 id="contrast-title">Contrast</h2>
          </div>
        </div>
        <div className={styles.matrixScroll}>
          <table className={styles.matrix}>
            <caption className={ui.visuallyHidden}>
              WCAG contrast ratio between each pair of colors in this palette.
            </caption>
            <thead>
              <tr>
                <td className={styles.matrixCorner} />
                {palette.colors.map((color) => (
                  <th key={color} scope="col" className={styles.matrixHead}>
                    <span
                      className={styles.matrixSwatch}
                      style={{ background: color } as CSSProperties}
                      aria-hidden="true"
                    />
                    {color}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={palette.colors[i]}>
                  <th scope="row" className={styles.matrixHead}>
                    <span
                      className={styles.matrixSwatch}
                      style={{ background: palette.colors[i] } as CSSProperties}
                      aria-hidden="true"
                    />
                    {palette.colors[i]}
                  </th>
                  {row.map((cell, j) => (
                    <td key={`${i}-${j}`} className={styles.matrixCell}>
                      {cell ? (
                        <>
                          <span className={styles.matrixRatio}>{cell.ratio}:1</span>
                          <span className={styles.matrixLevel}>{cell.level}</span>
                        </>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {firstTag && similarPalettes.length > 0 && (
        <section
          className={`${ui.section} ${styles.similarSection}`}
          aria-labelledby="similar-title"
        >
          <div className={ui.sectionHeading}>
            <div>
              <p className={ui.eyebrow}>More like this</p>
              <h2 id="similar-title">Similar palettes</h2>
            </div>
          </div>
          <div className={ui.paletteGrid}>
            {similarPalettes.map((p) => (
              <PaletteCard key={p.id} palette={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
