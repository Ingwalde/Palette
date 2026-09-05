import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { usePalette } from "../api/hooks";
import { createPalette, updatePalette } from "../api/palettes";
import { queryKeys } from "../api/queryKeys";
import { palettePath } from "../lib/palettePath";
import { ApiError } from "../lib/http";
import { EmptyState } from "../components/EmptyState";
import { PaletteForm, type PaletteFormValues } from "../components/PaletteForm";
import * as ui from "../styles/ui.css";

export function PaletteEditorPage() {
  const { handle, slug } = useParams();
  const isEdit = Boolean(handle && slug);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);

  // Not signed in → the editor is not available. Carry the intent so login returns here.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { replace: true, state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  const { data: palette, isLoading, error } = usePalette(handle ?? "", slug ?? "");

  const invalidate = (p: { owner_handle: string; slug: string }) => {
    queryClient.invalidateQueries({ queryKey: ["palettes"] });
    queryClient.invalidateQueries({
      queryKey: queryKeys.palette(p.owner_handle, p.slug),
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
  };

  const onSubmit = async (values: PaletteFormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      const result =
        isEdit && palette
          ? await updatePalette(palette.id, values)
          : await createPalette(values);
      showToast(isEdit ? "Palette updated" : "Palette created");
      invalidate(result);
      navigate(palettePath(result));
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Something went wrong", "error");
      setSaving(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isEdit) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <section className={ui.section}>
          <EmptyState
            title="Palette not found"
            text="This palette may have been renamed or removed."
            action={{ label: "Back to your palettes", to: "/palettes/mine" }}
          />
        </section>
      );
    }
    if (isLoading || !palette) {
      return (
        <section className={ui.section}>
          <p className={ui.muted} role="status">
            Loading…
          </p>
        </section>
      );
    }
    // Only the owner (or an admin) may edit. The backend enforces this too; this keeps the form
    // from ever rendering for someone who cannot save it.
    const isOwner = user?.username === palette.owner_handle || user?.is_admin;
    if (!isOwner) {
      return (
        <section className={ui.section}>
          <EmptyState
            title="You can't edit this palette"
            text="Only its owner can make changes."
            action={{ label: "Open the palette", to: palettePath(palette) }}
          />
        </section>
      );
    }
  }

  return (
    <>
      <section className={`${ui.section} ${ui.pageHero}`}>
        <p className={ui.eyebrow}>{isEdit ? "Edit" : "Create"}</p>
        <h1>{isEdit ? "Edit palette" : "New palette"}</h1>
        <p>
          {isEdit
            ? "Update the colors, tags and details. Changes are saved to your account."
            : "Pick your colors and tags. It's saved privately to your account until you publish it."}
        </p>
      </section>

      <section className={ui.section}>
        <PaletteForm
          initial={
            isEdit && palette
              ? {
                  name: palette.name,
                  description: palette.description,
                  colors: palette.colors,
                  tags: palette.tags,
                }
              : undefined
          }
          submitLabel={isEdit ? "Save changes" : "Create palette"}
          saving={saving}
          onSubmit={onSubmit}
          onCancel={() => navigate(-1)}
        />
      </section>
    </>
  );
}
