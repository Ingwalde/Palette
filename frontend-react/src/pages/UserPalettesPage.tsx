import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { listUserPalettes } from "../api/palettes";
import { PaletteCard } from "../components/PaletteCard";
import { PaletteCardSkeletonGrid } from "../components/PaletteCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import * as ui from "../styles/ui.css";

/**
 * A public profile listing: the palettes owned by `:handle`. Reached from a card byline
 * (`@handle`). Only public, active palettes come back from the API, so this never shows a user's
 * private drafts.
 */
export function UserPalettesPage() {
  const { handle = "" } = useParams();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["palettes", "user", handle],
    queryFn: () => listUserPalettes(handle),
    enabled: handle !== "",
  });
  const items = data?.items ?? [];

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Profile</p>
        <h1>@{handle}</h1>
        <p>Public palettes by @{handle}.</p>
      </section>

      <section className={ui.section} aria-label={`Palettes by ${handle}`}>
        <div className={ui.paletteGrid}>
          {isError ? (
            <EmptyState
              title="Couldn't load palettes"
              text="We couldn't load these palettes just now. Check your connection and try again."
              action={{ label: "Try again", onClick: () => void refetch() }}
            />
          ) : isLoading ? (
            <PaletteCardSkeletonGrid />
          ) : items.length === 0 ? (
            <EmptyState
              title="No public palettes"
              text={`@${handle} hasn't published any palettes yet.`}
            />
          ) : (
            items.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>
      </section>
    </>
  );
}
