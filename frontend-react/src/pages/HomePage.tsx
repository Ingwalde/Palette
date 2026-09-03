import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

// "default" is the implicit sort and is never written to the URL, so `/` and `/?sort=default`
// stay the same address. Only these two are real query values.
function readSort(raw: string | null): Sort {
  return raw === "az" || raw === "za" ? raw : "default";
}

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
  // The query string is the source of truth, so a filtered catalogue is a shareable link and
  // Back restores the previous filter. `q` is the applied search; the input keeps a local `draft`
  // so it does not lag a keystroke behind the debounce.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "all";
  const rawSort = params.get("sort");
  const sort = readSort(rawSort);

  const [draft, setDraft] = useState(q);
  const debounced = useDebounce(draft.trim(), 250);

  // draft → URL. `replace` so typing ten characters leaves one history entry, not ten. The
  // equality guard is what stops this and the URL→draft effect below from feeding each other.
  useEffect(() => {
    if (debounced === q) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debounced) next.set("q", debounced);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debounced, q, setParams]);

  // URL → draft. Covers Back, an external link and a reload; guarded so it does not clobber what
  // the user is mid-typing.
  useEffect(() => {
    setDraft((prev) => (prev.trim() === q ? prev : q));
  }, [q]);

  // A sort outside the known set (a hand-edited or stale URL) falls back to the default and is
  // stripped, so `/?sort=%3Cscript%3E` does not linger in the address bar.
  useEffect(() => {
    if (rawSort !== null && rawSort !== "az" && rawSort !== "za") {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("sort");
          return next;
        },
        { replace: true },
      );
    }
  }, [rawSort, setParams]);

  // Clicking a tag or changing the sort is ordinary navigation (not `replace`), so Back returns
  // the previous filter.
  const selectTag = (name: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (name === "all") next.delete("tag");
      else next.set("tag", name);
      return next;
    });

  const selectSort = (value: Sort) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "default") next.delete("sort");
      else next.set("sort", value);
      return next;
    });

  // Only the debounce effect above writes `q`, so clearing (and Random below) just empties the
  // draft and lets that one path carry it to the URL — writing `q` here as well would race the
  // still-pending debounced value and get clobbered by it.
  const clearSearch = () => setDraft("");

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
    search: q || undefined,
    tag: tag === "all" ? undefined : tag,
    sort,
    limit: 100,
  });
  const palettes = data?.items ?? [];

  const randomPalette = () => {
    if (palettes.length === 0) return;
    const pick = palettes[Math.floor(Math.random() * palettes.length)];
    setDraft(pick.name);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tag");
      next.delete("sort");
      return next;
    });
    document
      .getElementById("palettes")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className={`${ui.section} ${styles.hero}`} aria-labelledby="hero-title">
        <div>
          <p className={ui.eyebrow}>Palette v4.9.3 · Update!</p>
          <h1 id="hero-title">Find a color palette for your next design project.</h1>
          <p className={ui.heroText}>
            Search, filter, save and export palettes. Saving one now fills the heart the
            instant you click, and the account menu no longer repeats itself in the
            header.
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

      <section
        className={`${ui.section} ${styles.toolbarSection}`}
        aria-label="Palette tools"
      >
        <div className={ui.toolbar}>
          <label className={ui.searchField} htmlFor="searchInput">
            <span className={ui.visuallyHidden}>Search palettes</span>
            <input
              id="searchInput"
              type="search"
              placeholder="Search by name, description or tag..."
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button
              type="button"
              className={ui.searchClear}
              aria-label="Clear search"
              onClick={clearSearch}
            ></button>
          </label>

          <CustomSelect
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => selectSort(v as Sort)}
            ariaLabel="Sort palettes"
          />
        </div>

        {/* role="group" so the label is announced: an aria-label on a bare div is dropped. */}
        <div
          className={styles.tagFilters}
          role="group"
          aria-label="Filter palettes by tag"
        >
          {["all", ...chips].map((name) => (
            <button
              key={name}
              type="button"
              className={`${styles.tagButton}${tag === name ? ` ${styles.tagButtonActive}` : ""}`}
              // Which filter is on was conveyed only by colour until now.
              aria-pressed={tag === name}
              data-tag={name}
              onClick={() => selectTag(name)}
            >
              {name === "all" ? "All" : `#${name}`}
            </button>
          ))}
        </div>
      </section>

      <section
        className={`${ui.section} ${styles.palettesAnchor}`}
        id="palettes"
        aria-labelledby="palettes-title"
      >
        <div className={ui.sectionHeading}>
          <div>
            <p className={ui.eyebrow}>Backend data</p>
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
