import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

  const [searchInput, setSearchInput] = useState("");
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
      { replace: true },
    );
  };

  const setSource = (value: string) =>
    patchParams({ source: value, ...(value !== "single" ? { slug: null } : {}) });
  const setFormat = (value: ExportFormat) => patchParams({ format: value });
  const setSelectedSlug = (slug: string) => patchParams({ slug: slug || null });

  const singleMode = source === "single";

  // Keep the search box showing the selected palette's name when arriving from a deep link.
  const { data: selectedForName } = usePalettes(
    selectedSlug ? { search: selectedSlug, limit: 8 } : { limit: 1 },
  );
  useEffect(() => {
    if (!selectedSlug) return;
    const match = selectedForName?.items.find((p) => p.slug === selectedSlug);
    if (match) setSearchInput((prev) => (prev ? prev : match.name));
  }, [selectedSlug, selectedForName]);
  const query = useDebounce(searchInput.trim(), 180);

  // Search server-side rather than filtering a first-200 slice on the client: a match that sat
  // beyond the slice used to report "no palettes found". An empty query shows a small sample.
  const { data: paletteList } = usePalettes({
    search: query || undefined,
    limit: query ? 8 : 3,
  });
  const pickerResults = useMemo(() => paletteList?.items ?? [], [paletteList]);
  const { data: favorites } = useFavorites();

  const selectedPalettes: Palette[] = useMemo(() => {
    if (source === "favorites") return favorites ?? [];
    const found = pickerResults.find((p) => p.slug === selectedSlug);
    return found ? [found] : [];
  }, [source, favorites, pickerResults, selectedSlug]);

  const isPng = format === "png";

  const textOutput = useMemo(() => {
    if (isPng) return "";
    if (selectedPalettes.length === 0) {
      return singleMode
        ? "Choose one palette to generate export."
        : "No palettes selected. Add palettes to favorites.";
    }
    return generateExportText(selectedPalettes, format as TextFormat);
  }, [isPng, selectedPalettes, singleMode, format]);

  const pngDataUrl = useMemo(
    () =>
      isPng && selectedPalettes.length > 0
        ? generatePngDataUrl(selectedPalettes, singleMode)
        : "",
    [isPng, selectedPalettes, singleMode],
  );

  const selectedName = pickerResults.find((p) => p.slug === selectedSlug)?.name;
  const pickerStatus = selectedName
    ? `Selected: ${selectedName}`
    : "Choose one palette to export.";

  const onPickPalette = (palette: Palette) => {
    setSelectedSlug(palette.slug);
    setSearchInput(palette.name);
  };

  const onCopy = () => {
    if (selectedPalettes.length === 0) return showToast("Nothing to copy yet");
    void copyToClipboard(textOutput);
    showToast("Export result copied");
  };

  const onDownload = () => {
    if (isPng) {
      if (!pngDataUrl) return showToast("No palettes to export");
      downloadDataUrl(pngDataUrl, getExportFilename(selectedPalettes, "png"));
      showToast("PNG image downloaded");
      return;
    }
    if (selectedPalettes.length === 0) return showToast("Nothing to download yet");
    const ext = EXT[format as TextFormat];
    downloadTextFile(textOutput, getExportFilename(selectedPalettes, ext));
    showToast("Export file downloaded");
  };

  const caption =
    singleMode && selectedPalettes.length === 1
      ? `Previewing selected palette card: ${selectedPalettes[0].name}. Click Download PNG to save the image.`
      : `Previewing ${selectedPalettes.length} palette${selectedPalettes.length === 1 ? "" : "s"}. Click Download PNG to save the image.`;

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

          {singleMode && (
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
                      setSelectedSlug("");
                    }}
                  />
                  <button
                    type="button"
                    className={ui.searchClear}
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput("");
                      setSelectedSlug("");
                    }}
                  ></button>
                </span>
              </label>

              <div className={styles.pickerResults} aria-live="polite">
                {pickerResults.length === 0
                  ? null
                  : pickerResults.map((palette) => (
                      <button
                        key={palette.slug}
                        type="button"
                        className={`${styles.pickerOption}${palette.slug === selectedSlug ? ` ${styles.pickerOptionSelected}` : ""}`}
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
                {pickerResults.length === 0 ? "No palettes found." : pickerStatus}
              </p>
            </div>
          )}

          <label className={ui.field}>
            <span>Format</span>
            <CustomSelect
              options={FORMAT_OPTIONS}
              value={format}
              onChange={(v) => setFormat(v as ExportFormat)}
              ariaLabel="Export format"
            />
          </label>

          <div className={styles.panelActions}>
            {isPng ? (
              // PNG is a binary; there is nothing to copy, so download is the primary action.
              <button
                className={buttonClass("primary")}
                type="button"
                onClick={onDownload}
              >
                Download PNG
              </button>
            ) : (
              <>
                <button className={buttonClass("primary")} type="button" onClick={onCopy}>
                  Copy result
                </button>
                <button
                  className={buttonClass("secondary")}
                  type="button"
                  onClick={onDownload}
                >
                  Download file
                </button>
              </>
            )}
          </div>
        </aside>

        <section className={styles.result} aria-labelledby="export-title">
          <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
            <div>
              <p className={ui.eyebrow}>Preview</p>
              <h2 id="export-title">Generated output</h2>
            </div>
          </div>

          {isPng && pngDataUrl ? (
            <div className={styles.imagePreview}>
              <div className={styles.imageFrame}>
                <img id="exportPreviewImage" src={pngDataUrl} alt="PNG export preview" />
              </div>
              <p className={styles.imageCaption}>{caption}</p>
            </div>
          ) : (
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
