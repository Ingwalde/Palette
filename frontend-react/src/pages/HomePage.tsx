import { useMemo, useState } from "react";
import { usePalettes, useTags } from "../api/hooks";
import { useDebounce } from "../lib/useDebounce";
import { PaletteCard } from "../components/PaletteCard";
import { CustomSelect } from "../components/CustomSelect";
import type { PaletteListParams } from "../types/api";

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
      <section className="hero section" aria-labelledby="hero-title">
        <div className="hero__content">
          <p className="eyebrow">Palette v4.8.3 · Update!</p>
          <h1 id="hero-title">Find a color palette for your next design project.</h1>
          <p className="hero__text">
            Search, filter, save and export palettes. The React + TypeScript frontend now ships
            with Sentry error &amp; Web&nbsp;Vitals reporting, on top of a WCAG&nbsp;AA pass.
          </p>
          <div className="hero__actions">
            <a className="button button--primary" href="#palettes">
              Browse palettes
            </a>
            <button
              className="button button--secondary"
              type="button"
              onClick={randomPalette}
            >
              Random palette
            </button>
          </div>
        </div>

        <div className="hero-preview" aria-hidden="true">
          <div className="hero-preview__window">
            <div className="hero-preview__top"></div>
            <div className="hero-preview__grid">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="section toolbar-section" aria-label="Palette tools">
        <div className="toolbar">
          <label className="search-field" htmlFor="searchInput">
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
              className="search-clear"
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

        <div className="tag-filters" aria-label="Filter palettes by tag">
          {["all", ...chips].map((name) => (
            <button
              key={name}
              type="button"
              className={`tag-button${tag === name ? " tag-button--active" : ""}`}
              data-tag={name}
              onClick={() => setTag(name)}
            >
              {name === "all" ? "All" : `#${name}`}
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="palettes" aria-labelledby="palettes-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Backend data</p>
            <h2 id="palettes-title">Available palettes</h2>
          </div>
          <p className="result-count" aria-live="polite">
            {isLoading
              ? "Loading..."
              : isError
                ? "API error"
                : `${palettes.length} palette${palettes.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="palette-grid">
          {isError ? (
            <div className="empty-state">
              <h3>Backend unavailable</h3>
              <p>Could not reach the backend API. Start the stack and try again.</p>
            </div>
          ) : isLoading ? (
            <div className="empty-state">
              <h3>Loading palettes</h3>
              <p>The frontend is requesting data from the backend API.</p>
            </div>
          ) : palettes.length === 0 ? (
            <div className="empty-state">
              <h3>No palettes found</h3>
              <p>Try another name, tag or filter.</p>
            </div>
          ) : (
            palettes.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>
      </section>
    </>
  );
}
