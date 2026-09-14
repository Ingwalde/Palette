import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useClearFavorites } from "../api/hooks";
import { useToast } from "../components/toast/ToastProvider";
import { useModal } from "../components/modal/ModalProvider";
import { ActionMenu } from "../components/ActionMenu";
import { PaletteCard } from "../components/PaletteCard";
import { PaletteCardSkeletonGrid } from "../components/PaletteCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";

function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function FavoritesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const { data, isLoading, isError, error } = useFavorites();
  const clear = useClearFavorites();
  const { showToast } = useToast();
  const { confirm } = useModal();

  const favorites = data ?? [];
  const authError = isError && isAuthError(error);

  useEffect(() => {
    if (!isError) return;
    if (authError) showToast("Session expired — please log in again", "error");
    else
      showToast(
        error instanceof ApiError ? error.message : "Something went wrong",
        "error",
      );
  }, [isError, authError, error, showToast]);

  if (!isAuthenticated && !authLoading)
    return (
      <>
        <section className={`${ui.section} ${ui.pageHero}`}>
          <p className={ui.eyebrow}>Your collection</p>
          <h1>Your favorite palettes</h1>
          <p>A home for the colors you want to come back to.</p>
        </section>
        <section className={ui.section}>
          <EmptyState
            title="Keep your favorites together"
            text="Log in or create an account to save palettes and find them on any device. Browsing, copying and exporting public palettes are open to everyone."
            action={{
              label: "Log in / Create account",
              to: "/login",
              state: { from: location },
            }}
          />
        </section>
      </>
    );

  let count: string;
  if (authError) count = "Login required";
  else if (isLoading || authLoading) count = "Loading...";
  else if (isError) count = "API error";
  else count = `${favorites.length} saved palette${favorites.length === 1 ? "" : "s"}`;

  const clearDisabled =
    !!authError || isLoading || isError || favorites.length === 0 || clear.isPending;

  const onClear = async () => {
    const ok = await confirm({
      title: "Clear favorites",
      message: `Remove all ${favorites.length} saved palette${
        favorites.length === 1 ? "" : "s"
      }? This cannot be undone.`,
      confirmLabel: "Clear favorites",
      danger: true,
    });
    if (!ok) return;
    clear.mutate(undefined, {
      onSuccess: () => showToast("Favorites cleared"),
      onError: (e) =>
        showToast(e instanceof ApiError ? e.message : "Something went wrong", "error"),
    });
  };

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Saved palettes</p>
        <h1>Your favorite palettes</h1>
        <p>Palettes you save stay with your account, so they follow you to any device.</p>
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHeading}>
          <div>
            <h2>Favorites</h2>
            <p className={ui.muted}>{count}</p>
          </div>
          <div className={ui.buttonRow}>
            {favorites.length > 0 && (
              <Link className={buttonClass("secondary")} to="/export?source=favorites">
                Export favorites
              </Link>
            )}
            {favorites.length > 0 && (
              <ActionMenu label="Manage collection">
                <button
                  className={buttonClass("danger")}
                  type="button"
                  onClick={() => void onClear()}
                  disabled={clearDisabled}
                >
                  {clear.isPending ? "Clearing…" : "Clear favorites"}
                </button>
              </ActionMenu>
            )}
          </div>
        </div>

        <div className={ui.paletteGrid}>
          {authError ? (
            <EmptyState
              title="Please log in again"
              text="Your session has expired. Log in again to view and manage your saved palettes."
              action={{ label: "Log in", to: "/login", state: { from: location } }}
            />
          ) : isLoading || authLoading ? (
            <PaletteCardSkeletonGrid />
          ) : isError ? (
            <EmptyState
              title="Favorites are not available"
              text="We couldn't reach the server just now. Check your connection and try again."
            />
          ) : favorites.length === 0 ? (
            <EmptyState
              title="No favorites yet"
              text="Find a palette you love and save it here for later."
              action={{ label: "Browse palettes", to: "/#find" }}
            />
          ) : (
            favorites.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>
      </section>
    </>
  );
}
