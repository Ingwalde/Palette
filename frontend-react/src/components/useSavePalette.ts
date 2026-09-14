import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useFavorites, useToggleFavorite } from "../api/hooks";
import { ApiError } from "../lib/http";
import { rememberSaveIntent } from "../lib/saveIntent";
import type { Palette } from "../types/api";
import { useToast } from "./toast/ToastProvider";

/** Shared account-only Save behavior for cards and palette details. */
export function useSavePalette(palette?: Palette) {
  const { isAuthenticated, isLoading } = useAuth();
  const { data: favorites, isLoading: loadingFavorites } = useFavorites();
  const mutation = useToggleFavorite();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const saved =
    isAuthenticated && !!palette && (favorites ?? []).some((p) => p.id === palette.id);
  const toggle = () => {
    if (
      !palette ||
      isLoading ||
      (isAuthenticated && loadingFavorites) ||
      mutation.isPending
    )
      return;
    if (!isAuthenticated) {
      rememberSaveIntent(
        palette,
        location.pathname + location.search + location.hash,
        location.state,
      );
      navigate("/login", { state: { from: location } });
      return;
    }
    mutation.mutate(
      { slug: palette.slug, saved, palette },
      {
        onSuccess: () =>
          showToast(saved ? "Removed from favorites" : "Added to favorites"),
        onError: (error) =>
          showToast(
            error instanceof ApiError ? error.message : "Could not update favorites",
            "error",
          ),
      },
    );
  };
  return {
    saved,
    pending: isLoading || (isAuthenticated && loadingFavorites) || mutation.isPending,
    toggle,
  };
}
