import { useMemo, useState } from "react";
import { usePalettes, useTags } from "../api/hooks";
import { useDebounce } from "../lib/useDebounce";
import { PaletteCard } from "../components/PaletteCard";
import { CustomSelect } from "../components/CustomSelect";
import type { PaletteListParams } from "../types/api";
import { EmptyState } from "../components/EmptyState";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./HomePage.css";

type Sort = NonNullable<PaletteListParams["sort"]>;

const SORT_OPTIONS = [
  { value: "default", label: "Default order" },
  { value: "az", label: "Name A-Z" },
  { value: "za", label: "Name Z-A" },
];

// Pick up to `count` random items — a lighter, rotating home tag filter.
function pickRandom<T>(list: T[], count: number): T[] {
  const shuffled = [...list];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function HomePage() {
  const [searchInput, setSearchInput] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState<Sort>("default");
  const search = useDebounce(searchInput.trim(), 250);

  const { data: tags } = useTags();
  const chips = useMemo(
    () =>
      pickRandom(
        (tags ?? []).map((t) => t.name),
        10,
      ),
    [tags],
  );

  const { data, isLoading, isError } = usePalettes({
    search: search || undefined,
    tag: tag === "all" ? undefined : tag,
    sort,
    limit: 100,
  });
  const palettes = data?.items ?? [];

  const randomPalette = () => {
    if (palettes.length === 0) return;
    const pick = palettes[Math.floor(Math.random() * palettes.length)];
    setSearchInput(pick.name);
    setTag("all");
    setSort("default");
    document
      .getElementById("palettes")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className={`section ${styles.hero}`} aria-labelledby="hero-title">
        <div>
          <p className="eyebrow">Palette v4.8.3 · Update!</p>
          <h1 id="hero-title">Find a color palette for your next design project.</h1>
          <p className={ui.heroText}>
            Search, filter, save and export palettes. The React + TypeScript frontend now
            ships with Sentry error &amp; Web&nbsp;Vitals reporting, on top of a
            WCAG&nbsp;AA pass.
          </p>
          <div className={styles.heroActions}>
            <a className={buttonClass("primary")} href="#palettes">
              Browse palettes
            </a>
            <button
              className={buttonClass("secondary")}
              type="button"
              onClick={randomPalette}
            >
              Random palette
            </button>
          </div>
        </div>

        <div className={styles.heroPreview} aria-hidden="true">
          <div className={styles.heroPreviewWindow}>
            <div className={styles.heroPreviewTop}></div>
            <div className={styles.heroPreviewGrid}>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </section>

      <section className={`section ${styles.toolbarSection}`} aria-label="Palette tools">
        <div className={ui.toolbar}>
          <label className={ui.searchField} htmlFor="searchInput">
            <span className="visually-hidden">Search palettes</span>
            <input
              id="searchInput"
              type="search"
              placeholder="Search by name, description or tag..."
              autoComplete="off"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button
              type="button"
              className={ui.searchClear}
              aria-label="Clear search"
              onClick={() => setSearchInput("")}
            ></button>
          </label>

          <CustomSelect
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => setSort(v as Sort)}
            ariaLabel="Sort palettes"
          />
        </div>

        <div className={styles.tagFilters} aria-label="Filter palettes by tag">
          {["all", ...chips].map((name) => (
            <button
              key={name}
              type="button"
              className={`${styles.tagButton}${tag === name ? ` ${styles.tagButtonActive}` : ""}`}
              data-tag={name}
              onClick={() => setTag(name)}
            >
              {name === "all" ? "All" : `#${name}`}
            </button>
          ))}
        </div>
      </section>

      <section
        className={`section ${styles.palettesAnchor}`}
        id="palettes"
        aria-labelledby="palettes-title"
      >
        <div className={ui.sectionHeading}>
          <div>
            <p className="eyebrow">Backend data</p>
            <h2 id="palettes-title">Available palettes</h2>
          </div>
          <p className={styles.resultCount} aria-live="polite">
            {isLoading
              ? "Loading..."
              : isError
                ? "API error"
                : `${palettes.length} palette${palettes.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={ui.paletteGrid}>
          {isError ? (
            <EmptyState
              title="Backend unavailable"
              text="Could not reach the backend API. Start the stack and try again."
            />
          ) : isLoading ? (
            <EmptyState
              title="Loading palettes"
              text="The frontend is requesting data from the backend API."
            />
          ) : palettes.length === 0 ? (
            <EmptyState
              title="No palettes found"
              text="Try another name, tag or filter."
            />
          ) : (
            palettes.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>
      </section>
    </>
  );
}
