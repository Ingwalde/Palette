import { useState, type FormEvent, type ReactNode } from "react";
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
  onSubmit: (values: PaletteFormValues) => void;
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
}: PaletteFormProps) {
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

  const setColorAt = (i: number, value: string) =>
    setColors((cs) => cs.map((c, idx) => (idx === i ? value : c)));
  const addColor = () =>
    setColors((cs) => (cs.length >= MAX_COLORS ? cs : [...cs, DEFAULT_COLOR]));
  const removeColor = (i: number) =>
    setColors((cs) => (cs.length > 1 ? cs.filter((_, idx) => idx !== i) : cs));

  const addTag = (raw: string) => {
    const value = normalizeTag(raw);
    if (!value || paletteTags.includes(value)) return;
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
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      colors: colors.map((c) => c.trim()).filter(Boolean),
      tags: paletteTags,
    });
  };

  return (
    <form className={admin.form} onSubmit={submit}>
      {header}

      <label className={ui.field}>
        <span>Name</span>
        <input
          className={ui.input}
          type="text"
          placeholder="Nordic Blue"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <label className={ui.field}>
        <span>Description</span>
        <textarea
          className={ui.textarea}
          rows={4}
          placeholder="Short description..."
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <div className={ui.field}>
        <span>Colors</span>
        <div className={colorEditor.editor}>
          {colors.map((color, i) => (
            <div className={colorEditor.row} key={i}>
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
                onChange={(e) => setColorAt(i, e.target.value)}
              />
              <button
                className={`${buttonClass("ghost")} ${colorEditor.remove}`}
                type="button"
                aria-label="Remove color"
                onClick={() => removeColor(i)}
              >
                ✕
              </button>
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
                onMouseDown={(e) => {
                  e.preventDefault();
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

      <div className={ui.formActions}>
        <button className={buttonClass("primary")} type="submit" disabled={saving}>
          {submitLabel}
        </button>
        {onCancel && (
          <button className={buttonClass("secondary")} type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
