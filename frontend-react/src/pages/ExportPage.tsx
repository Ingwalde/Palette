import { useMemo, useState } from "react";
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
  { value: "scss", label: "SCSS variables" },
  { value: "json", label: "JSON" },
  { value: "png", label: "PNG image" },
];
const EXT: Record<Exclude<ExportFormat, "png">, string> = {
  css: "css",
  scss: "scss",
  json: "json",
};

function matches(palette: Palette, query: string): boolean {
  const haystack = [
    palette.name,
    palette.slug,
    palette.description,
    ...(palette.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function ExportPage() {
  const [source, setSource] = useState("single");
  const [format, setFormat] = useState<ExportFormat>("css");
  const [searchInput, setSearchInput] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const { showToast } = useToast();

  const singleMode = source === "single";
  const query = useDebounce(searchInput.trim().toLowerCase(), 180);

  const { data: paletteList } = usePalettes({ limit: 200 });
  const allPalettes = useMemo(() => paletteList?.items ?? [], [paletteList]);
  const { data: favorites } = useFavorites();

  // Stable random sample shown when the picker search is empty.
  const defaultSample = useMemo(
    () => [...allPalettes].sort(() => Math.random() - 0.5).slice(0, 3),
    [allPalettes],
  );
  const pickerResults = query
    ? allPalettes.filter((p) => matches(p, query)).slice(0, 8)
    : defaultSample;

  const selectedPalettes: Palette[] = useMemo(() => {
    if (source === "favorites") return favorites ?? [];
    const found = allPalettes.find((p) => p.slug === selectedSlug);
    return found ? [found] : [];
  }, [source, favorites, allPalettes, selectedSlug]);

  const isPng = format === "png";

  const textOutput = useMemo(() => {
    if (isPng) return "";
    if (selectedPalettes.length === 0) {
      return singleMode
        ? "Choose one palette to generate export."
        : "No palettes selected. Add palettes to favorites.";
    }
    return generateExportText(selectedPalettes, format as Exclude<ExportFormat, "png">);
  }, [isPng, selectedPalettes, singleMode, format]);

  const pngDataUrl = useMemo(
    () =>
      isPng && selectedPalettes.length > 0
        ? generatePngDataUrl(selectedPalettes, singleMode)
        : "",
    [isPng, selectedPalettes, singleMode],
  );

  const selectedName = allPalettes.find((p) => p.slug === selectedSlug)?.name;
  const pickerStatus = selectedName
    ? `Selected: ${selectedName}`
    : "Choose one palette to export.";

  const onPickPalette = (palette: Palette) => {
    setSelectedSlug(palette.slug);
    setSearchInput(palette.name);
  };

  const onPreview = () => {
    if (isPng) {
      if (selectedPalettes.length === 0) return showToast("Choose a palette to preview");
      showToast("PNG preview updated");
      return;
    }
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
    const ext = EXT[format as Exclude<ExportFormat, "png">];
    downloadTextFile(textOutput, getExportFilename(selectedPalettes, ext));
    showToast("Export file downloaded");
  };

  const caption =
    singleMode && selectedPalettes.length === 1
      ? `Previewing selected palette card: ${selectedPalettes[0].name}. Click Download file to save the PNG image.`
      : `Previewing ${selectedPalettes.length} palette${selectedPalettes.length === 1 ? "" : "s"}. Click Download file to save the PNG image.`;

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Developer tools</p>
        <h1>Export palettes</h1>
        <p>
          Generate ready-to-use CSS variables, SCSS variables, JSON or a polished PNG
          preview from backend data.
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
                if (v !== "single") {
                  setSelectedSlug("");
                  setSearchInput("");
                }
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
            <button className={buttonClass("primary")} type="button" onClick={onPreview}>
              {isPng ? "Refresh preview" : "Copy result"}
            </button>
            <button
              className={buttonClass("secondary")}
              type="button"
              onClick={onDownload}
            >
              Download file
            </button>
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
