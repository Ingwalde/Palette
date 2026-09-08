import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useFavorites, usePalettes, usePalettesInfinite, useTags } from "../api/hooks";
import { useAuth } from "../auth/AuthContext";
import { useDebounce } from "../lib/useDebounce";
import { PaletteCard } from "../components/PaletteCard";
import { PaletteCardSkeletonGrid } from "../components/PaletteCardSkeleton";
import { HeroPaletteWidget } from "../components/HeroPaletteWidget";
import { TaskRouter } from "../components/TaskRouter";
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
  // The query string is the source of truth, so a filtered catalogue is a shareable link and
  // Back restores the previous filter. `q` is the applied search; the input keeps a local `draft`
  // so it does not lag a keystroke behind the debounce.
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "all";
  const rawSort = params.get("sort");
  const sort = readSort(rawSort);

  const { format, setFormat } = useColorFormat();

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
    if (rawSort !== null && rawSort !== "popular" && rawSort !== "curated") {
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
  });
  const palettes = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;

  // The hero shows a real featured palette, drawn from a small pool independent of the catalogue's
  // current search/tag filter (so filtering the grid never swaps it). Only palettes with four or
  // more colours qualify. `heroSeed` is state, not a memo, so the Shuffle button can draw a new one
  // without a navigation; it still starts fresh on each mount, so a new visit shows a different one.
  const { data: heroPool } = usePalettes({ sort: "popular", limit: 48 });
  const [heroSeed, setHeroSeed] = useState(() => Math.random());
  const reshuffle = () => setHeroSeed(Math.random());
  const featured = useMemo(() => {
    const pool = (heroPool?.items ?? []).filter((p) => p.colors.length >= 4);
    if (pool.length === 0) return undefined;
    return pool[Math.floor(heroSeed * pool.length)];
  }, [heroPool, heroSeed]);

  // Micro-proof under the hero CTA: the live catalogue size and tag count, so the page reads as
  // active rather than a static landing. `total` is the full public count from the pool query.
  const { isAuthenticated, user } = useAuth();
  const { data: favorites } = useFavorites();
  const favoriteCount = favorites?.length ?? 0;
  const paletteTotal = heroPool?.total ?? 0;
  const tagTotal = tags?.length ?? 0;
  const statsLine =
    paletteTotal > 0
      ? `${paletteTotal} palette${paletteTotal === 1 ? "" : "s"} · ${tagTotal} tag${tagTotal === 1 ? "" : "s"}`
      : "";

  return (
    <>
      <section className={`${ui.section} ${styles.hero}`} aria-labelledby="hero-title">
        <div>
          {isAuthenticated ? (
            <>
              <p className={ui.eyebrow}>Welcome back</p>
              <h1 id="hero-title">{user?.username ?? "Your palettes"}</h1>
              <p className={ui.heroText}>
                Pick up where you left off, or start something new.
              </p>
              <div className={styles.heroActions}>
                <Link className={buttonClass("primary")} to="/palettes/new">
                  Create palette
                </Link>
                <Link className={buttonClass("secondary")} to="/favorites">
                  Your favorites{favoriteCount > 0 ? ` (${favoriteCount})` : ""}
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className={ui.eyebrow}>Curated color palettes</p>
              <h1 id="hero-title">Copy-ready color palettes, tested for contrast.</h1>
              <p className={ui.heroText}>
                Search the community's palettes, check their accessibility, and make them
                your own.
              </p>
              <div className={styles.heroActions}>
                <a className={buttonClass("primary")} href="#palettes">
                  Browse palettes
                </a>
                <Link className={buttonClass("secondary")} to="/login">
                  Create free account
                </Link>
              </div>
            </>
          )}
          {statsLine && (
            <p className={styles.heroStats} aria-live="polite">
              {statsLine}
            </p>
          )}
          <Link className={styles.heroWhatsNew} to="/changelog">
            What's new in v5.1
          </Link>
        </div>

        {featured ? (
          <HeroPaletteWidget palette={featured} onShuffle={reshuffle} />
        ) : (
          <div className={styles.heroPreview} aria-hidden="true">
            <div className={styles.heroPreviewWindow}>
              <div className={styles.heroPreviewTop}></div>
              <div className={styles.heroPreviewGrid}>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className={styles.heroPreviewSwatchPlaceholder} />
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        className={`${ui.section} ${styles.routerSection}`}
        aria-label="Get started"
      >
        <TaskRouter />
      </section>

      <section
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

            <div className={styles.toolbarControls}>
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
            <h2 id="palettes-title">Explore the community</h2>
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
