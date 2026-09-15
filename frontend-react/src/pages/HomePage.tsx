import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePalettesInfinite, useTags } from "../api/hooks";
import { COLOR_COUNTS, readColorCount } from "../lib/catalogParams";
import { useCatalogScroll } from "../lib/useCatalogScroll";
import { useDebounce } from "../lib/useDebounce";
import { useSearchPlaceholder } from "../lib/useSearchPlaceholder";
import { HeroEditorial } from "../components/HeroEditorial";
import { PaletteCard } from "../components/PaletteCard";
import { PaletteCardSkeletonGrid } from "../components/PaletteCardSkeleton";
import { CustomSelect } from "../components/CustomSelect";
import { useColorFormat } from "../components/ColorFormatContext";
import type { ColorFormat } from "../lib/color";
import type { Tag } from "../types/api";
import { EmptyState } from "../components/EmptyState";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./HomePage.css";

// How many tag chips the row shows before "More tags".
const TAG_LIMIT = 10;

// The community feed sorts. "new" is the implicit default and is never written to the URL, so `/`
// and `/?sort=new` are the same address.
type FeedSort = "new" | "popular" | "curated";

const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "popular", label: "Most popular" },
  { value: "curated", label: "Curated" },
];

const COUNT_OPTIONS = [
  { value: "all", label: "Any count" },
  ...COLOR_COUNTS.map((n) => ({
    value: String(n),
    label: `${n} color${n === 1 ? "" : "s"}`,
  })),
];

const FORMAT_OPTIONS = [
  { value: "hex", label: "HEX" },
  { value: "rgb", label: "RGB" },
  { value: "hsl", label: "HSL" },
  { value: "oklch", label: "OKLCH" },
];

function readSort(raw: string | null): FeedSort {
  return raw === "popular" || raw === "curated" ? raw : "new";
}

export function HomePage() {
  const searchPlaceholder = useSearchPlaceholder();
  // The query string is the source of truth, so a filtered catalogue is a shareable link and
  // Back restores the previous filter. `q` is the applied search; the input keeps a local `draft`
  // so it does not lag a keystroke behind the debounce.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "all";
  const rawSort = params.get("sort");
  const sort = readSort(rawSort);
  const rawColorCount = params.get("color_count");
  const colorCount = readColorCount(rawColorCount);
  useCatalogScroll();

  const { format, setFormat } = useColorFormat();

  // The draft belongs to a URL query. Reset it during render on external navigation so a stale
  // debounce cannot overwrite Back/Forward with the query from the page we just left.
  const [searchState, setSearchState] = useState({ q, draft: q });
  if (searchState.q !== q) setSearchState({ q, draft: q });
  const draft = searchState.q === q ? searchState.draft : q;
  const setDraft = (value: string) => setSearchState({ q, draft: value });
  const debounced = useDebounce(draft.trim(), 250);
  useEffect(() => {
    if (debounced === q || debounced !== draft.trim()) return;
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (debounced) next.set("q", debounced);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [debounced, draft, q, setParams]);

  // A sort outside the known set (a hand-edited or stale URL) falls back to the default and is
  // stripped, so `/?sort=%3Cscript%3E` does not linger in the address bar.
  useEffect(() => {
    const invalidSort =
      rawSort !== null && rawSort !== "popular" && rawSort !== "curated";
    const invalidCount = rawColorCount !== null && colorCount === undefined;
    if (invalidSort || invalidCount) {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (invalidSort) next.delete("sort");
          if (invalidCount) next.delete("color_count");
          return next;
        },
        { replace: true },
      );
    }
  }, [rawSort, rawColorCount, colorCount, setParams]);

  // Clicking a tag or changing the sort is ordinary navigation (not `replace`), so Back returns
  // the previous filter.
  const selectTag = (name: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (name === "all" || name === tag) next.delete("tag");
      else next.set("tag", name);
      return next;
    });

  const selectSort = (value: FeedSort) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value === "new") next.delete("sort");
      else next.set("sort", value);
      return next;
    });

  // Only the debounce effect above writes `q`, so clearing just empties the draft and lets that one
  // path carry it to the URL — writing `q` here as well would race the still-pending debounced
  // value and get clobbered by it.
  const clearSearch = () => setDraft("");

  const { data: tags } = useTags();
  const [showAllTags, setShowAllTags] = useState(false);

  // Ranked by usage, ties broken alphabetically so the order is stable across renders — the old
  // random pick reshuffled on every recompute and, worse, could drop the active tag out of view
  // while it stayed applied. Deterministic, and the active tag is always kept.
  const sortedTags = useMemo(
    () =>
      [...(tags ?? [])].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    [tags],
  );
  const visibleTags = useMemo(() => {
    const top = sortedTags.slice(0, TAG_LIMIT);
    if (tag === "all" || top.some((t) => t.name === tag)) return top;
    const active = sortedTags.find((t) => t.name === tag);
    return active ? [...top, active] : top;
  }, [sortedTags, tag]);
  const overflowTags = useMemo(
    () => sortedTags.filter((t) => !visibleTags.includes(t)),
    [sortedTags, visibleTags],
  );

  const tagChip = (t: Tag) => (
    <button
      key={t.name}
      type="button"
      className={`${styles.tagButton}${tag === t.name ? ` ${styles.tagButtonActive}` : ""}${
        t.kind === "purpose" ? ` ${styles.tagButtonPurpose}` : ""
      }`}
      aria-pressed={tag === t.name}
      data-tag={t.name}
      onClick={() => selectTag(t.name)}
    >
      #{t.name}
      <span className={styles.tagCount}> · {t.count}</span>
    </button>
  );

  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = usePalettesInfinite({
    search: q || undefined,
    tag: tag === "all" ? undefined : tag,
    sort,
    color_count: colorCount,
  });
  const palettes = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  return (
    <>
      <HeroEditorial />

      <section
        id="find"
        className={`${ui.section} ${styles.toolbarSection}`}
        aria-label="Palette tools"
      >
        <div className={styles.searchPanel}>
          <div className={styles.toolbarRow}>
            <label
              className={`${ui.searchField} ${styles.searchGrow}`}
              htmlFor="searchInput"
            >
              <span className={ui.visuallyHidden}>Search palettes</span>
              <input
                id="searchInput"
                type="search"
                {...searchPlaceholder}
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

            <div className={styles.toolbarControls}>
              <CustomSelect
                options={COUNT_OPTIONS}
                value={colorCount ? String(colorCount) : "all"}
                ariaLabel="Number of colors"
                onChange={(value) =>
                  setParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (value === "all") next.delete("color_count");
                    else next.set("color_count", value);
                    return next;
                  })
                }
              />
              <CustomSelect
                options={SORT_OPTIONS}
                value={sort}
                onChange={(v) => selectSort(v as FeedSort)}
                ariaLabel="Sort palettes"
              />
              <CustomSelect
                options={FORMAT_OPTIONS}
                value={format}
                onChange={(v) => setFormat(v as ColorFormat)}
                ariaLabel="Color format"
              />
            </div>
          </div>

          {/* role="group" so the label is announced: an aria-label on a bare div is dropped. */}
          <div
            className={styles.tagFilters}
            role="group"
            aria-label="Filter palettes by tag"
          >
            <button
              type="button"
              className={`${styles.tagButton}${tag === "all" ? ` ${styles.tagButtonActive}` : ""}`}
              aria-pressed={tag === "all"}
              data-tag="all"
              onClick={() => selectTag("all")}
            >
              All
            </button>
            {visibleTags.map(tagChip)}
            {(q || tag !== "all" || colorCount || sort !== "new") && (
              <button
                type="button"
                className={styles.moreTags}
                onClick={() => {
                  setParams({});
                  setDraft("");
                }}
              >
                Reset filters
              </button>
            )}

            {overflowTags.length > 0 && (
              <button
                type="button"
                className={styles.moreTags}
                aria-expanded={showAllTags}
                aria-controls="more-tags"
                onClick={() => setShowAllTags((v) => !v)}
              >
                {showAllTags ? "Fewer tags" : "More tags"}
              </button>
            )}

            {/* Kept in the DOM and toggled with `hidden` so the More tags button genuinely controls
              a region a screen reader can find. */}
            <div id="more-tags" className={styles.moreTagsList} hidden={!showAllTags}>
              {overflowTags.map(tagChip)}
            </div>
          </div>
        </div>
      </section>

      <section
        className={`${ui.section} ${styles.palettesAnchor}`}
        id="palettes"
        aria-labelledby="palettes-title"
      >
        <div className={ui.sectionHeading}>
          <div>
            <p className={ui.eyebrow}>Browse</p>
            <h2 id="palettes-title">All palettes</h2>
          </div>
          <p className={styles.resultCount} aria-live="polite">
            {isLoading
              ? "Loading..."
              : isError
                ? "API error"
                : `Showing ${palettes.length} of ${total} palette${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={ui.paletteGrid}>
          {isError ? (
            <EmptyState
              title="Couldn't load palettes"
              text="We couldn't load the palettes just now. Check your connection and try again."
              action={{ label: "Try again", onClick: () => void refetch() }}
            />
          ) : isLoading ? (
            <PaletteCardSkeletonGrid />
          ) : palettes.length === 0 ? (
            <EmptyState
              title="No palettes found"
              text="Try another name, tag or filter."
            />
          ) : (
            palettes.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>

        {hasNextPage && (
          <div className={styles.loadMore}>
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
