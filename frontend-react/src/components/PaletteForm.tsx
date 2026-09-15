import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { UnsavedChangesGuard } from "./UnsavedChangesGuard";
import { useModal } from "./modal/ModalProvider";
import { useTags } from "../api/hooks";
import { useToast } from "./toast/ToastProvider";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";
// The colour-row and tag editors are the admin form's; the user editor reuses them rather than a
// second copy of 150 lines of markup and styles.
import * as colorEditor from "../pages/ColorEditor.css";
import * as admin from "../pages/AdminPage.css";

export const DEFAULT_COLOR = "#3f4e4f";
const MAX_COLORS = 8;
const MAX_TAGS = 12;

const normalizeTag = (value: string) => value.trim().toLowerCase().replace(/#/g, "");

export interface PaletteFormValues {
  name: string;
  description: string;
  colors: string[];
  tags: string[];
}

const EMPTY: PaletteFormValues = {
  name: "",
  description: "",
  colors: [DEFAULT_COLOR],
  tags: [],
};

interface PaletteFormProps {
  initial?: PaletteFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: PaletteFormValues, allowNavigation: () => void) => void;
  onDirtyChange?: (dirty: boolean) => void;
  error?: string;
  onCancel?: () => void;
  cancelLabel?: string;
  header?: ReactNode;
}

export function PaletteForm({
  initial = EMPTY,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
  header,
  onDirtyChange,
  error,
}: PaletteFormProps) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const { confirm } = useModal();
  const { data: tags } = useTags();
  const { showToast } = useToast();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [colors, setColors] = useState<string[]>(
    initial.colors.length ? initial.colors : [DEFAULT_COLOR],
  );
  const [paletteTags, setPaletteTags] = useState<string[]>(initial.tags);
  const [tagInput, setTagInput] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [rowIds, setRowIds] = useState(() =>
    initial.colors.map((_, i) => `${formId}-${i}`),
  );
  const nextRow = useRef(initial.colors.length);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value.trim());
  const baseline = useRef(JSON.stringify(initial));
  const current = JSON.stringify({ name, description, colors, tags: paletteTags });
  const dirty = useRef(false);
  dirty.current = current !== baseline.current;
  useEffect(() => {
    onDirtyChange?.(current !== baseline.current);
  }, [current, onDirtyChange]);
  const allowNavigation = () => {
    baseline.current = current;
    dirty.current = false;
    onDirtyChange?.(false);
  };
  const cancel = async () => {
    if (saving) return;
    if (
      dirty.current &&
      !(await confirm({
        title: "Discard changes?",
        message: "Your palette has unsaved changes.",
        confirmLabel: "Discard changes",
        cancelLabel: "Stay",
        danger: true,
      }))
    )
      return;
    allowNavigation();
    onCancel?.();
  };
  const moveColor = (index: number, direction: number) => {
    const target = index + direction;
    if (target < 0 || target >= colors.length) return;
    const move = <T,>(items: T[]) => {
      const copy = [...items];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    };
    setColors(move);
    setRowIds(move);
  };

  const setColorAt = (i: number, value: string) =>
    setColors((cs) => cs.map((c, idx) => (idx === i ? value : c)));
  const addColor = () => {
    if (colors.length >= MAX_COLORS) return;
    setColors((cs) => [...cs, DEFAULT_COLOR]);
    setRowIds((ids) => [...ids, `${formId}-${nextRow.current++}`]);
  };
  const removeColor = (i: number) => {
    if (colors.length <= 1) return;
    setColors((cs) => cs.filter((_, index) => index !== i));
    setRowIds((ids) => ids.filter((_, index) => index !== i));
  };

  const addTag = (raw: string) => {
    const value = normalizeTag(raw);
    if (!value || paletteTags.includes(value)) return;
    if (value.length > 60) {
      showToast("Use up to 60 characters per tag", "error");
      return;
    }
    if (paletteTags.length >= MAX_TAGS) {
      showToast(`Up to ${MAX_TAGS} tags per palette`, "error");
      return;
    }
    setPaletteTags((t) => [...t, value]);
  };
  const suggestions = (tags ?? [])
    .filter(
      (t) =>
        !paletteTags.includes(t.name) && t.name.includes(tagInput.trim().toLowerCase()),
    )
    .slice(0, 8);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const invalid: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 160)
      invalid.name = "Use 2–160 characters.";
    if (description.trim().length > 1000)
      invalid.description = "Use up to 1000 characters.";
    colors.forEach((color, index) => {
      if (!validHex(color)) invalid[rowIds[index]] = "Enter a HEX color such as #3F4E4F.";
    });
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      requestAnimationFrame(() =>
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    onSubmit(
      {
        name: name.trim(),
        description: description.trim(),
        colors: colors.map((c) => c.trim().toUpperCase()),
        tags: paletteTags,
      },
      allowNavigation,
    );
  };

  return (
    <form ref={formRef} className={admin.form} onSubmit={submit} noValidate>
      <UnsavedChangesGuard dirty={dirty} />
      <fieldset disabled={saving} className={colorEditor.fields}>
        {header}

        <div className={ui.field}>
          <span>Colors · {colors.length} / 8</span>
          <div className={colorEditor.preview} aria-label="Live palette preview">
            {colors.map((color, i) => (
              <span
                key={rowIds[i]}
                style={{ background: validHex(color) ? color : undefined }}
              >
                {!validHex(color) && <span>Invalid HEX</span>}
              </span>
            ))}
          </div>
          <div className={colorEditor.editor}>
            {colors.map((color, i) => (
              <div className={colorEditor.row} key={rowIds[i]}>
                <input
                  className={colorEditor.picker}
                  type="color"
                  aria-label={`Colour ${i + 1} picker`}
                  value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_COLOR}
                  onChange={(e) => setColorAt(i, e.target.value.toUpperCase())}
                />
                <input
                  className={`${ui.input} ${colorEditor.hex}`}
                  type="text"
                  maxLength={7}
                  aria-label="HEX color"
                  value={color.toUpperCase()}
                  aria-invalid={!!errors[rowIds[i]]}
                  aria-describedby={errors[rowIds[i]] ? `${rowIds[i]}-error` : undefined}
                  onBlur={() =>
                    setErrors((prev) => ({
                      ...prev,
                      [rowIds[i]]: validHex(color) ? "" : "Enter a 6-digit HEX color.",
                    }))
                  }
                  onChange={(e) => setColorAt(i, e.target.value)}
                />
                <div className={colorEditor.reorder}>
                  <button
                    type="button"
                    className={buttonClass("ghost")}
                    aria-label={`Move color ${i + 1} left`}
                    disabled={i === 0}
                    onClick={() => moveColor(i, -1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={buttonClass("ghost")}
                    aria-label={`Move color ${i + 1} right`}
                    disabled={i === colors.length - 1}
                    onClick={() => moveColor(i, 1)}
                  >
                    →
                  </button>
                </div>
                <button
                  disabled={colors.length === 1}
                  className={`${buttonClass("ghost")} ${colorEditor.remove}`}
                  type="button"
                  aria-label="Remove color"
                  onClick={() => removeColor(i)}
                >
                  ✕
                </button>
                {errors[rowIds[i]] && (
                  <small
                    className={colorEditor.error}
                    id={`${rowIds[i]}-error`}
                    role="alert"
                  >
                    {errors[rowIds[i]]}
                  </small>
                )}
              </div>
            ))}
          </div>
          <div className={colorEditor.footer}>
            <button
              className={buttonClass("ghost")}
              type="button"
              onClick={addColor}
              disabled={colors.length >= MAX_COLORS}
            >
              + Add color
            </button>
            <small className={ui.hint}>1–8 HEX colors.</small>
          </div>
        </div>

        <label className={ui.field}>
          <span>Name</span>
          <input
            className={ui.input}
            type="text"
            placeholder="Nordic Blue"
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${formId}-name-error` : undefined}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && (
            <small id={`${formId}-name-error`} role="alert">
              {errors.name}
            </small>
          )}
        </label>

        <label className={ui.field}>
          <span>Description</span>
          <textarea
            className={ui.textarea}
            rows={4}
            placeholder="Short description..."
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? `${formId}-description-error` : undefined
            }
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && (
            <small id={`${formId}-description-error`} role="alert">
              {errors.description}
            </small>
          )}
        </label>

        <div className={ui.field}>
          <span>Tags</span>
          <div className={admin.tagEditor}>
            {paletteTags.map((tag) => (
              <span className={admin.tagChip} key={tag} data-value={tag}>
                {tag}
                <button
                  className={admin.tagChipRemove}
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => setPaletteTags((t) => t.filter((x) => x !== tag))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className={admin.tagSuggest}>
            <input
              className={ui.input}
              type="text"
              placeholder="Type or pick a tag"
              autoComplete="off"
              role="combobox"
              aria-expanded={suggestOpen && suggestions.length > 0}
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestOpen(false), 120)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                  setTagInput("");
                } else if (e.key === "Escape") {
                  setSuggestOpen(false);
                }
              }}
            />
            <div
              className={admin.tagSuggestMenu}
              role="listbox"
              hidden={!suggestOpen || suggestions.length === 0}
            >
              {suggestions.map((tag) => (
                <button
                  key={tag.name}
                  className={admin.tagSuggestOption}
                  type="button"
                  role="option"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addTag(tag.name);
                    setTagInput("");
                  }}
                >
                  <span className={admin.tagSuggestName}>{tag.name}</span>
                  {tag.kind === "purpose" && (
                    <span className={`${admin.tagBadge} ${admin.tagBadgeKind.purpose}`}>
                      Category
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <small className={ui.hint}>
            Press Enter or comma to add, or pick from the list. Up to 12 tags.
          </small>
        </div>

        {error && <p role="alert">{error}</p>}
        <div className={ui.formActions}>
          <button className={buttonClass("primary")} type="submit" disabled={saving}>
            {saving ? "Saving…" : submitLabel}
          </button>
          {onCancel && (
            <button
              className={buttonClass("secondary")}
              type="button"
              onClick={() => void cancel()}
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
