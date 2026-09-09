import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useUserPalettesInfinite, useUserProfile } from "../api/hooks";
import { PaletteCard } from "../components/PaletteCard";
import { PaletteCardSkeletonGrid } from "../components/PaletteCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/http";
import { API_BASE_URL } from "../lib/apiBase";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./UserPalettesPage.css";

function memberSince(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * A public profile: the palettes owned by `:handle`, reached from a card byline (`@handle`).
 * The API returns only public, active palettes, so a stranger never sees private drafts; an
 * unknown handle 404s (a real not-found, not an empty listing).
 */
export function UserPalettesPage() {
  const { handle = "" } = useParams();

  const profile = useUserProfile(handle);
  const feed = useUserPalettesInfinite(handle);
  const palettes = useMemo(
    () => feed.data?.pages.flatMap((p) => p.items) ?? [],
    [feed.data],
  );

  // A 404 on the profile means the account does not exist — a not-found page, not an empty grid.
  const notFound = profile.error instanceof ApiError && profile.error.status === 404;
  if (notFound) {
    return (
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Profile</p>
        <h1>Profile not found</h1>
        <p>There is no account with the handle @{handle}.</p>
      </section>
    );
  }

  const count = profile.data?.palette_count ?? 0;
  const since = profile.data ? memberSince(profile.data.created_at) : "";

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <div className={styles.profileHeader}>
          {profile.data?.has_avatar ? (
            <img
              className={styles.avatar}
              src={`${API_BASE_URL}/users/${encodeURIComponent(handle)}/avatar`}
              alt=""
            />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">
              {handle.charAt(0).toUpperCase()}
            </span>
          )}
          <div className={styles.profileText}>
            <p className={ui.eyebrow}>Profile</p>
            <h1>@{handle}</h1>
            <p className={styles.profileMeta}>
              {count} palette{count === 1 ? "" : "s"}
              {since ? ` · since ${since}` : ""}
            </p>
          </div>
        </div>
      </section>

      <section className={ui.section} aria-label={`Palettes by ${handle}`}>
        <div className={ui.paletteGrid}>
          {feed.isError ? (
            <EmptyState
              title="Couldn't load palettes"
              text="We couldn't load these palettes just now. Check your connection and try again."
              action={{ label: "Try again", onClick: () => void feed.refetch() }}
            />
          ) : feed.isLoading ? (
            <PaletteCardSkeletonGrid />
          ) : palettes.length === 0 ? (
            <EmptyState
              title="No public palettes"
              text={`@${handle} hasn't published any palettes yet.`}
            />
          ) : (
            palettes.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>

        {feed.hasNextPage && (
          <div
            className={ui.buttonRow}
            style={{ justifyContent: "center", marginTop: 28 }}
          >
            <button
              type="button"
              className={buttonClass("secondary")}
              onClick={() => void feed.fetchNextPage()}
              disabled={feed.isFetchingNextPage}
            >
              {feed.isFetchingNextPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
