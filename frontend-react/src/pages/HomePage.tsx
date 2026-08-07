import { useMemo, useState } from "react";
import { usePalettes, useTags } from "../api/hooks";
import { useDebounce } from "../lib/useDebounce";
import { PaletteCard } from "../components/PaletteCard";
import type { PaletteListParams } from "../types/api";
import styles from "./HomePage.module.css";

type Sort = NonNullable<PaletteListParams["sort"]>;

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

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="hero-title">
        <p className={styles.eyebrow}>Palette · React + TypeScript</p>
        <h1 id="hero-title" className={styles.title}>
          Find a color palette for your next design project.
        </h1>
        <p className={styles.text}>
          Search, filter, save and export palettes — now served by the new React frontend.
        </p>
      </section>

      <section className={styles.toolbar} aria-label="Palette tools">
        <div className={styles.controls}>
          <label className={styles.search}>
            <span className={styles.visuallyHidden}>Search palettes</span>
            <input
              type="search"
              placeholder="Search by name, description or tag..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
          </label>
          <label className={styles.visuallyHidden} htmlFor="sort">
            Sort palettes
          </label>
          <select
            id="sort"
            className={styles.select}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value="default">Default order</option>
            <option value="az">Name A-Z</option>
            <option value="za">Name Z-A</option>
          </select>
        </div>

        <div className={styles.chips} aria-label="Filter palettes by tag">
          {["all", ...chips].map((name) => (
            <button
              key={name}
              type="button"
              className={`${styles.chip} ${tag === name ? styles.chipActive : ""}`}
              onClick={() => setTag(name)}
            >
              {name === "all" ? "All" : `#${name}`}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.results} aria-labelledby="results-title">
        <div className={styles.resultsHead}>
          <h2 id="results-title">Available palettes</h2>
          <p className={styles.count} aria-live="polite">
            {isLoading
              ? "Loading…"
              : isError
                ? "API error"
                : `${palettes.length} palette${palettes.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {isError ? (
          <p className={styles.state}>
            Could not reach the backend API. Start the stack and try again.
          </p>
        ) : !isLoading && palettes.length === 0 ? (
          <p className={styles.state}>
            No palettes found. Try another name, tag or filter.
          </p>
        ) : (
          <div className={styles.grid}>
            {palettes.map((palette) => (
              <PaletteCard key={palette.id} palette={palette} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
