import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { getPalette } from "../api/palettes";
import { request } from "../lib/http";
import { CURATOR_HANDLE } from "../lib/constants";
import { usePalettes, useFavorites } from "../api/hooks";
import { useDebounce } from "../lib/useDebounce";
import { useToast } from "../components/toast/ToastProvider";
import { CustomSelect } from "../components/CustomSelect";
import { copyToClipboard } from "../lib/color";
import {
  generateExportText,
  generatePngDataUrl,
  getExportFilename,
  downloadTextFile,
  downloadDataUrl,
  type ExportFormat,
  type TextFormat,
} from "../lib/exportGenerators";
import type { Palette } from "../types/api";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./ExportPage.css";

const SOURCE_OPTIONS = [
  { value: "single", label: "Choose palette" },
  { value: "favorites", label: "Favorites only" },
];
const FORMAT_OPTIONS = [
  { value: "css", label: "CSS variables" },
  { value: "oklch", label: "CSS (OKLCH)" },
  { value: "tailwind", label: "Tailwind config" },
  { value: "json", label: "JSON" },
  { value: "svg", label: "SVG strip" },
  { value: "png", label: "PNG image" },
];
const FORMATS: ExportFormat[] = ["css", "oklch", "tailwind", "json", "svg", "png"];
// File extension per text format; the download name uses it.
const EXT: Record<TextFormat, string> = {
  css: "css",
  oklch: "css",
  tailwind: "js",
  json: "json",
  svg: "svg",
};

export function ExportPage() {
  // Export state lives in the URL so "export this palette in this format" is a shareable link
  // (?source=single|favorites&format=…&slug=…). The palette page links here with it pre-filled.
  const [params, setParams] = useSearchParams();
  const source = params.get("source") === "favorites" ? "favorites" : "single";
  const formatParam = params.get("format");
  const format: ExportFormat = FORMATS.includes(formatParam as ExportFormat)
    ? (formatParam as ExportFormat)
    : "css";
  const selectedSlug = params.get("slug") ?? "";
  const selectedHandle = params.get("handle") ?? "";
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  const [searchInput, setSearchInput] = useState("");
  const [changing, setChanging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [operationError, setOperationError] = useState("");
  const { showToast } = useToast();

  const patchParams = (next: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const merged = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(next)) {
          if (value === null || value === "") merged.delete(key);
          else merged.set(key, value);
        }
        return merged;
      },
      { replace: false },
    );
  };

  const setSource = (value: string) => patchParams({ source: value });
  const setFormat = (value: ExportFormat) => patchParams({ format: value });

  const singleMode = source === "single";

  // Fetch the exact visibility-checked resource. A picker sample is not a source of identity:
  // deep links and private owner palettes must work even when absent from public search results.
  const {
    data: selected,
    isLoading: selectedLoading,
    isError: selectedError,
  } = useQuery({
    queryKey: ["export-palette", user?.id ?? "guest", selectedHandle, selectedSlug],
    queryFn: () =>
      selectedHandle
        ? getPalette(selectedHandle, selectedSlug)
        : request<Palette>(`/palettes/${encodeURIComponent(selectedSlug)}`),
    enabled: singleMode && !!selectedSlug,
    retry: false,
  });
  useEffect(() => {
    if (selected) setSearchInput((prev) => prev || selected.name);
  }, [selected]);
  const query = useDebounce(searchInput.trim(), 180);

  // Search server-side rather than filtering a first-200 slice on the client: a match that sat
  // beyond the slice used to report "no palettes found". An empty query shows a small sample.
  const {
    data: paletteList,
    isLoading: searchLoading,
    isError: searchError,
  } = usePalettes({
    search: query || undefined,
    limit: query ? 8 : 3,
  });
  const pickerResults = useMemo(() => paletteList?.items ?? [], [paletteList]);
  const {
    data: favorites,
    isLoading: favoritesLoading,
    isError: favoritesError,
  } = useFavorites();

  const selectedPalettes: Palette[] = useMemo(() => {
    if (source === "favorites") return isAuthenticated ? (favorites ?? []) : [];
    return selected && !selectedError ? [selected] : [];
  }, [source, favorites, isAuthenticated, selected, selectedError]);

  const isPng = format === "png";
  const isImage = isPng || format === "svg";

  const textOutput = useMemo(() => {
    if (isPng) return "";
    if (selectedPalettes.length === 0) {
      return singleMode
        ? "Choose one palette to generate export."
        : "No palettes selected. Add palettes to favorites.";
    }
    return generateExportText(selectedPalettes, format as TextFormat);
  }, [isPng, selectedPalettes, singleMode, format]);

  const [imageResult, setImageResult] = useState({ key: "", url: "", error: "" });
  const imageKey = JSON.stringify([format, singleMode, selectedPalettes]);
  useEffect(() => {
    if (!isImage || selectedPalettes.length === 0) return;
    const frame = requestAnimationFrame(() => {
      try {
        const url = isPng
          ? generatePngDataUrl(selectedPalettes, singleMode)
          : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(textOutput)}`;
        if (!url) throw new Error("Image preview unavailable");
        setImageResult({ key: imageKey, url, error: "" });
      } catch {
        setImageResult({
          key: imageKey,
          url: "",
          error: "Could not generate this image. Try another format.",
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [imageKey, isImage, isPng, selectedPalettes, singleMode, textOutput]);
  const generating =
    isImage && selectedPalettes.length > 0 && imageResult.key !== imageKey;
  const pngDataUrl = imageResult.key === imageKey ? imageResult.url : "";
  const generationError = imageResult.key === imageKey ? imageResult.error : "";
  const ready =
    selectedPalettes.length > 0 &&
    !generating &&
    !generationError &&
    !(singleMode ? selectedError || selectedLoading : favoritesLoading || favoritesError);

  const selectedName = selected?.name;
  const pickerStatus = selectedName
    ? `Selected: ${selectedName}`
    : "Choose one palette to export.";

  const onPickPalette = (palette: Palette) => {
    patchParams({ slug: palette.slug, handle: palette.owner_handle || CURATOR_HANDLE });
    setSearchInput(palette.name);
    setChanging(false);
  };

  const onCopy = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setOperationError("");
    try {
      await copyToClipboard(textOutput);
      showToast("Export result copied");
    } catch {
      setOperationError("Could not copy to the clipboard. Try downloading the file.");
    } finally {
      setBusy(false);
    }
  };

  const onDownload = () => {
    if (!ready || busy) return;
    setBusy(true);
    setOperationError("");
    try {
      if (isPng) downloadDataUrl(pngDataUrl, getExportFilename(selectedPalettes, "png"));
      else
        downloadTextFile(
          textOutput,
          getExportFilename(selectedPalettes, EXT[format as TextFormat]),
        );
      showToast("File download started");
    } catch {
      setOperationError("Could not start the download. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const caption =
    singleMode && selectedPalettes.length === 1
      ? `Previewing selected palette card: ${selectedPalettes[0].name}. Use Download to export the image.`
      : `Previewing ${selectedPalettes.length} palette${selectedPalettes.length === 1 ? "" : "s"}. Use Download to export the image.`;

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Export</p>
        <h1>Export palettes</h1>
        <p>
          Generate CSS variables, OKLCH, a Tailwind config, JSON, an SVG strip or a
          polished PNG from any palette. Every choice lives in the URL, so an export is a
          link you can share.
        </p>
      </section>

      <section className={`${ui.section} ${styles.layout}`}>
        <aside className={styles.panel} aria-label="Export settings">
          <label className={ui.field}>
            <span>Palette source</span>
            <CustomSelect
              options={SOURCE_OPTIONS}
              value={source}
              onChange={(v) => {
                setSource(v);
                if (v !== "single") setSearchInput("");
              }}
              ariaLabel="Palette source"
            />
          </label>

          {singleMode && selected && !changing && (
            <div className={styles.selection}>
              <div className={styles.selectedColors} aria-label="Selected palette colors">
                {selected.colors.map((color, i) => (
                  <span key={i} style={{ background: color }} />
                ))}
              </div>
              <strong>{selected.name}</strong>
              <small className={ui.muted}>
                by {selected.owner_handle} · {selected.colors.length} colors
              </small>
              <button
                type="button"
                className={buttonClass("ghost")}
                onClick={() => setChanging(true)}
              >
                Change palette
              </button>
            </div>
          )}
          {singleMode && (!selected || changing) && (
            <div className={styles.picker}>
              <label className={ui.field}>
                <span>Search palette</span>
                <span className={ui.searchInputWrap}>
                  <input
                    className={ui.input}
                    type="search"
                    placeholder="Type palette name, slug or tag..."
                    autoComplete="off"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    className={ui.searchClear}
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput("");
                    }}
                  ></button>
                </span>
              </label>

              {selected && (
                <button
                  type="button"
                  className={buttonClass("ghost")}
                  onClick={() => setChanging(false)}
                >
                  Keep selection
                </button>
              )}
              {searchLoading && <p role="status">Searching…</p>}
              {searchError && <p role="alert">Could not search palettes. Try again.</p>}
              <div className={styles.pickerResults} aria-live="polite">
                {pickerResults.length === 0
                  ? null
                  : pickerResults.map((palette) => (
                      <button
                        key={palette.id}
                        type="button"
                        className={`${styles.pickerOption}${palette.slug === selectedSlug && palette.owner_handle === selectedHandle ? ` ${styles.pickerOptionSelected}` : ""}`}
                        onClick={() => onPickPalette(palette)}
                      >
                        <span className={styles.pickerOptionInfo}>
                          <strong>{palette.name}</strong>
                          <small>{palette.slug}</small>
                        </span>
                        <span className={styles.pickerSwatches} aria-hidden="true">
                          {palette.colors.map((color, i) => (
                            <span
                              key={i}
                              style={{ "--swatch-color": color } as React.CSSProperties}
                            />
                          ))}
                        </span>
                      </button>
                    ))}
              </div>
              <p className={styles.pickerStatus}>
                {selectedLoading
                  ? "Loading selected palette…"
                  : selectedError
                    ? "This palette is unavailable or you do not have access."
                    : selectedName
                      ? pickerStatus
                      : pickerResults.length === 0
                        ? "No palettes found."
                        : pickerStatus}
              </p>
            </div>
          )}

          {!singleMode && !isAuthenticated && (
            <p className={ui.muted}>
              Log in to export your favorites.{" "}
              <Link to="/login" state={{ from: location }}>
                Log in / Create account
              </Link>
            </p>
          )}
          {!singleMode && isAuthenticated && (
            <p role={favoritesError ? "alert" : "status"}>
              {favoritesLoading
                ? "Loading favorites…"
                : favoritesError
                  ? "Could not load favorites."
                  : `${favorites?.length ?? 0} saved palettes`}
              {!favoritesLoading && !favoritesError && !favorites?.length && (
                <>
                  {" "}
                  · <Link to="/">Browse palettes</Link>
                </>
              )}
            </p>
          )}
          <div className={styles.formatGroups} role="group" aria-label="Export type">
            <button type="button" aria-pressed={isImage} onClick={() => setFormat("png")}>
              Image
            </button>
            <button
              type="button"
              aria-pressed={!isImage}
              onClick={() => setFormat("css")}
            >
              Code
            </button>
          </div>
          <label className={ui.field}>
            <span>Format</span>
            <CustomSelect
              options={FORMAT_OPTIONS.filter(
                (o) => isImage === ["png", "svg"].includes(o.value),
              )}
              value={format}
              onChange={(v) => setFormat(v as ExportFormat)}
              ariaLabel="Export format"
            />
          </label>
        </aside>

        <section className={styles.result} aria-labelledby="export-title">
          <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
            <div>
              <p className={ui.eyebrow}>Preview</p>
              <h2 id="export-title">{isImage ? "Image preview" : "Generated output"}</h2>
            </div>
          </div>
          <div className={styles.panelActions}>
            {isImage ? (
              // Image formats offer a download beside the visual preview.
              <button
                className={buttonClass("primary")}
                type="button"
                onClick={onDownload}
                disabled={!ready || busy}
              >
                {generating ? "Generating…" : `Download ${format.toUpperCase()}`}
              </button>
            ) : (
              <>
                <button
                  className={buttonClass("primary")}
                  type="button"
                  onClick={() => void onCopy()}
                  disabled={!ready || busy}
                >
                  {busy ? "Copying…" : "Copy code"}
                </button>
                <button
                  className={buttonClass("secondary")}
                  type="button"
                  onClick={onDownload}
                  disabled={!ready || busy}
                >
                  Download file
                </button>
              </>
            )}
          </div>
          {operationError && <p role="alert">{operationError}</p>}
          {generationError && <p role="alert">{generationError}</p>}
          {generating && <p role="status">Generating image…</p>}
          {selectedPalettes.length === 0 ? (
            <p className={styles.empty}>Choose a palette to preview and export.</p>
          ) : isImage && pngDataUrl ? (
            <div className={styles.imagePreview}>
              <div className={styles.imageFrame}>
                <img
                  id="exportPreviewImage"
                  src={pngDataUrl}
                  alt={`${format.toUpperCase()} export preview`}
                />
              </div>
              <p className={styles.imageCaption}>{caption}</p>
            </div>
          ) : isImage ? null : (
            <pre className={styles.codeOutput}>
              <code>
                {isPng ? "Choose one palette to generate PNG preview." : textOutput}
              </code>
            </pre>
          )}
        </section>
      </section>
    </>
  );
}
