import { useEffect, type CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { listMyPalettes, setPaletteVisibility } from "../api/palettes";
import { palettePath } from "../lib/palettePath";
import { ApiError } from "../lib/http";
import { EmptyState } from "../components/EmptyState";
import type { Palette, PaletteVisibility } from "../types/api";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
import * as styles from "./YourPalettesPage.css";

export function YourPalettesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["palettes", "mine"],
    queryFn: listMyPalettes,
    enabled: isAuthenticated,
  });
  const items = data?.items ?? [];

  const visibility = useMutation({
    mutationFn: ({ id, visibility }: { id: number; visibility: PaletteVisibility }) =>
      setPaletteVisibility(id, visibility),
    onSuccess: (updated) => {
      showToast(updated.visibility === "public" ? "Published" : "Made private");
      queryClient.invalidateQueries({ queryKey: ["palettes"] });
    },
    onError: (e) =>
      showToast(e instanceof ApiError ? e.message : "Something went wrong", "error"),
  });

  if (!isAuthenticated) return null;

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>Your account</p>
        <h1>Your palettes</h1>
        <p>
          The palettes you've made. Publish one to share it, or keep it private while you
          work.
        </p>
      </section>

      <section className={ui.section}>
        <div className={styles.headerRow}>
          <p className={ui.muted}>
            {isLoading
              ? "Loading…"
              : isError
                ? "Couldn't load your palettes"
                : `${items.length} palette${items.length === 1 ? "" : "s"}`}
          </p>
          <Link className={buttonClass("primary")} to="/palettes/new">
            New palette
          </Link>
        </div>

        {isError ? (
          <EmptyState
            title="Couldn't load your palettes"
            text="Check your connection and try again."
            action={{ label: "Try again", onClick: () => void refetch() }}
          />
        ) : isLoading ? (
          <p className={ui.muted} role="status">
            Loading your palettes…
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            title="No palettes yet"
            text="Create your first palette and it'll show up here."
            action={{ label: "New palette", to: "/palettes/new" }}
          />
        ) : (
          <div className={styles.list}>
            {items.map((palette: Palette) => {
              const isPublic = palette.visibility === "public";
              return (
                <article className={styles.item} key={palette.id}>
                  <div className={styles.swatches} aria-hidden="true">
                    {palette.colors.slice(0, 6).map((color, i) => (
                      <span
                        key={i}
                        className={styles.swatch}
                        style={{ background: color } as CSSProperties}
                      />
                    ))}
                  </div>
                  <div className={styles.info}>
                    <h2 className={styles.title}>
                      <Link className={styles.titleLink} to={palettePath(palette)}>
                        {palette.name}
                      </Link>
                    </h2>
                    <span
                      className={`${styles.badge} ${
                        isPublic ? styles.badgeKind.public : styles.badgeKind.private
                      }`}
                    >
                      {isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={buttonClass(isPublic ? "ghost" : "primary")}
                      disabled={visibility.isPending}
                      onClick={() =>
                        visibility.mutate({
                          id: palette.id,
                          visibility: isPublic ? "private" : "public",
                        })
                      }
                    >
                      {isPublic ? "Make private" : "Publish"}
                    </button>
                    <Link
                      className={buttonClass("secondary")}
                      to={`${palettePath(palette)}/edit`}
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
