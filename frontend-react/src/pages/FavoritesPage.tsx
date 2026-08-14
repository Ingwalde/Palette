import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useClearFavorites } from "../api/hooks";
import { useToast } from "../components/toast/ToastProvider";
import { PaletteCard } from "../components/PaletteCard";
import { EmptyState } from "../components/EmptyState";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";

function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function FavoritesPage() {
  const { isAuthenticated } = useAuth();
  const { data, isLoading, isError, error } = useFavorites();
  const clear = useClearFavorites();
  const { showToast } = useToast();

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

  let count: string;
  if (!isAuthenticated || authError) count = "Login required";
  else if (isLoading) count = "Loading...";
  else if (isError) count = "API error";
  else count = `${favorites.length} saved palette${favorites.length === 1 ? "" : "s"}`;

  const clearDisabled =
    !isAuthenticated || isLoading || isError || favorites.length === 0 || clear.isPending;

  const onClear = () => {
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
        <p>Favorites are connected to your account and stored in the backend database.</p>
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHeading}>
          <div>
            <h2>Favorites</h2>
            <p className={ui.muted}>{count}</p>
          </div>
          <button
            className={buttonClass("danger")}
            type="button"
            onClick={onClear}
            disabled={clearDisabled}
          >
            Clear favorites
          </button>
        </div>

        <div className={ui.paletteGrid}>
          {!isAuthenticated ? (
            <EmptyState
              title="Log in to view favorites"
              text="Favorites are now connected to your account. Log in to save and view your palettes."
              action={{ label: "Log in", to: "/login" }}
            />
          ) : isLoading ? (
            <EmptyState
              title="Loading favorites"
              text="The app is loading your saved palettes from the backend API."
            />
          ) : authError ? (
            <EmptyState
              title="Please log in again"
              text="Your session has expired. Log in again to view and manage your saved palettes."
              action={{ label: "Log in", to: "/login" }}
            />
          ) : isError ? (
            <EmptyState
              title="Favorites are not available"
              text="We couldn't reach the server just now. Check your connection and try again."
            />
          ) : favorites.length === 0 ? (
            <EmptyState
              title="No favorites yet"
              text="Go to the home page and save your first palette."
            />
          ) : (
            favorites.map((palette) => <PaletteCard key={palette.id} palette={palette} />)
          )}
        </div>
      </section>
    </>
  );
}
