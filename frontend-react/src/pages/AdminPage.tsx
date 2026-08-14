import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { useModal } from "../components/modal/ModalProvider";
import { CustomSelect } from "../components/CustomSelect";
import { EmptyState } from "../components/EmptyState";
import {
  listPalettes,
  createPalette,
  updatePalette,
  deletePalette,
} from "../api/palettes";
import { listTags, createTag, updateTag, deleteTag } from "../api/tags";
import { queryKeys } from "../api/queryKeys";
import { ApiError } from "../lib/http";
import { useDebounce } from "../lib/useDebounce";
import type { Palette, Tag, TagKind } from "../types/api";
import * as colorEditor from "./ColorEditor.css";
import * as styles from "./AdminPage.css";
import * as ui from "../styles/ui.css";
import * as home from "./HomePage.css";

const DEFAULT_COLOR = "#3f4e4f";
const MAX_COLORS = 8;
const MAX_TAGS = 12;
const PAGE_SIZE = 10;

const normalizeTag = (value: string) => value.trim().toLowerCase().replace(/#/g, "");
const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong";

export function AdminPage() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const refreshAccess = () => queryClient.invalidateQueries({ queryKey: queryKeys.auth });

  if (isLoading) return <section className="section" />;

  if (!isAuthenticated || !isAdmin) {
    const title = !isAuthenticated ? "Login required" : "Admin role required";
    const message = !isAuthenticated
      ? "You need to login with an admin account to manage palettes."
      : `User ${user?.username} is logged in, but this account does not have admin access.`;
    return (
      <>
        <AdminHero />
        <section className={`section ${styles.access}`}>
          <div className={styles.accessCard}>
            <p className="eyebrow">Protected area</p>
            <h2>{title}</h2>
            <p className="muted">{message}</p>
            <div className="form-actions">
              <Link className="button button--primary" to="/login">
                Go to login
              </Link>
              <button
                className="button button--ghost"
                type="button"
                onClick={refreshAccess}
              >
                Refresh access
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  return <AdminPanel username={user?.username ?? ""} />;
}

function AdminHero() {
  return (
    <section className={`section ${ui.pageHero}`}>
      <p className="eyebrow">Admin</p>
      <h1>Manage palettes</h1>
      <p>
        Admin actions are protected with username/password authentication and an admin
        role.
      </p>
    </section>
  );
}

function AdminPanel({ username }: { username: string }) {
  const [mode, setMode] = useState<"palettes" | "tags">("palettes");

  return (
    <>
      <AdminHero />
      <section className={`section ${styles.layout}`}>
        <div className={styles.toolbar}>
          <div>
            <p className="eyebrow">Admin session · {username}</p>
            <h2>Admin panel</h2>
          </div>
          <div
            className={styles.mode}
            role="tablist"
            aria-label="Admin mode"
            data-active={mode}
          >
            <span className={styles.modePill} aria-hidden="true" />
            <button
              className={`${styles.modeButton}${mode === "palettes" ? ` ${styles.modeButtonActive}` : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "palettes"}
              onClick={() => setMode("palettes")}
            >
              Palettes
            </button>
            <button
              className={`${styles.modeButton}${mode === "tags" ? ` ${styles.modeButtonActive}` : ""}`}
              type="button"
              role="tab"
              aria-selected={mode === "tags"}
              onClick={() => setMode("tags")}
            >
              Tags
            </button>
          </div>
        </div>

        {mode === "palettes" ? <PalettesView /> : <TagsView />}
      </section>
    </>
  );
}

/* ------------------------------- Palettes view ------------------------------ */

function PalettesView() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useModal();
  const { data: tags } = useQuery({ queryKey: queryKeys.tags, queryFn: listTags });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<string[]>([DEFAULT_COLOR]);
  const [paletteTags, setPaletteTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [offset, setOffset] = useState(0);
  const search = useDebounce(searchInput.trim(), 250);

  useEffect(() => setOffset(0), [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-palettes", search, offset],
    queryFn: () =>
      listPalettes({ sort: "az", search: search || undefined, limit: PAGE_SIZE, offset }),
  });
  const total = data?.total ?? 0;
  const items = useMemo(() => data?.items ?? [], [data]);

  useEffect(() => {
    if (!isLoading && items.length === 0 && offset > 0) setOffset(0);
  }, [isLoading, items, offset]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-palettes"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    queryClient.invalidateQueries({ queryKey: ["palettes"] });
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setColors([DEFAULT_COLOR]);
    setPaletteTags([]);
    setTagInput("");
  };

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      description: description.trim(),
      colors: colors.map((c) => c.trim()).filter(Boolean),
      tags: paletteTags,
    };
    try {
      if (editingId !== null) {
        await updatePalette(editingId, payload);
        showToast("Palette updated");
      } else {
        await createPalette(payload);
        showToast("Palette created");
      }
      resetForm();
      invalidateAll();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  const onEdit = (palette: Palette) => {
    setEditingId(palette.id);
    setName(palette.name);
    setDescription(palette.description);
    setColors(palette.colors.length ? palette.colors : [DEFAULT_COLOR]);
    setPaletteTags(palette.tags);
    setTagInput("");
  };

  const onDelete = async (palette: Palette) => {
    const ok = await confirm({
      title: "Delete palette",
      message: "Delete this palette from the database? This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePalette(palette.id);
      showToast("Palette deleted");
      invalidateAll();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  // colour editor
  const setColorAt = (i: number, value: string) =>
    setColors((cs) => cs.map((c, idx) => (idx === i ? value : c)));
  const addColor = () =>
    setColors((cs) => (cs.length >= MAX_COLORS ? cs : [...cs, DEFAULT_COLOR]));
  const removeColor = (i: number) =>
    setColors((cs) => (cs.length > 1 ? cs.filter((_, idx) => idx !== i) : cs));

  // tag chips
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className={styles.view}>
      <form className={styles.form} onSubmit={onSave}>
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className="eyebrow">Palette</p>
            <h2>{editingId !== null ? "Edit palette" : "Add palette"}</h2>
          </div>
        </div>

        <label className="field">
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

        <label className="field">
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

        <div className="field">
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
                  className={`button button--ghost ${colorEditor.remove}`}
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
              className="button button--ghost"
              type="button"
              onClick={addColor}
              disabled={colors.length >= MAX_COLORS}
            >
              + Add color
            </button>
            <small className="hint">1–8 HEX colors.</small>
          </div>
        </div>

        <div className="field">
          <span>Tags</span>
          <div className={styles.tagEditor}>
            {paletteTags.map((tag) => (
              <span className={styles.tagChip} key={tag} data-value={tag}>
                {tag}
                <button
                  className={styles.tagChipRemove}
                  type="button"
                  aria-label={`Remove ${tag}`}
                  onClick={() => setPaletteTags((t) => t.filter((x) => x !== tag))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className={styles.tagSuggest}>
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
              className={styles.tagSuggestMenu}
              role="listbox"
              hidden={!suggestOpen || suggestions.length === 0}
            >
              {suggestions.map((tag) => (
                <button
                  key={tag.name}
                  className={styles.tagSuggestOption}
                  type="button"
                  role="option"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(tag.name);
                    setTagInput("");
                  }}
                >
                  <span className={styles.tagSuggestName}>{tag.name}</span>
                  {tag.kind === "purpose" && (
                    <span className={`${styles.tagBadge} ${styles.tagBadgeKind.purpose}`}>
                      Category
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <small className="hint">
            Press Enter or comma to add, or pick from the list. Up to 12 tags.
          </small>
        </div>

        <div className="form-actions">
          <button className="button button--primary" type="submit">
            {editingId !== null ? "Update palette" : "Create palette"}
          </button>
          {editingId !== null && (
            <button
              className="button button--secondary"
              type="button"
              onClick={resetForm}
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <section className={styles.list} aria-label="Palettes in the database">
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className="eyebrow">Database</p>
            <h2>Palettes in the database</h2>
          </div>
          <p className={home.resultCount}>
            {isLoading
              ? "Loading..."
              : isError
                ? "API error"
                : `${total} palette${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <label className={`${ui.searchField} ${styles.listSearch}`}>
          <span className="visually-hidden">Search palettes</span>
          <input
            type="search"
            placeholder="Search by name, description or tag..."
            autoComplete="off"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="button"
            className={ui.searchClear}
            aria-label="Clear search"
            onClick={() => setSearchInput("")}
          />
        </label>

        <div className={styles.items}>
          {isError ? (
            <EmptyState
              title="Backend is not available"
              text="Start the stack with: docker compose up"
            />
          ) : isLoading ? (
            <EmptyState
              title="Loading palettes"
              text="The admin panel is requesting database data."
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={search ? "No matches" : "No palettes in database"}
              text={
                search
                  ? "No palettes match that search."
                  : "Create your first palette using the form."
              }
            />
          ) : (
            items.map((palette) => (
              <article className={styles.item} key={palette.id}>
                <div className={styles.itemTop}>
                  <div>
                    <h3 className={styles.itemTitle}>{palette.name}</h3>
                    <p className={styles.itemSlug}>/{palette.slug}</p>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => onEdit(palette)}
                    >
                      Edit
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => void onDelete(palette)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className={styles.swatches}>
                  {palette.colors.map((color, i) => (
                    <span
                      key={i}
                      style={{ "--swatch-color": color } as CSSProperties}
                      title={color}
                    />
                  ))}
                </div>
              </article>
            ))
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className={styles.pagination}>
            <button
              className="button button--ghost"
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              ← Prev
            </button>
            <span className={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="button button--ghost"
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* --------------------------------- Tags view -------------------------------- */

const KIND_OPTIONS = [
  { value: "free", label: "Tag" },
  { value: "purpose", label: "Category" },
];

function TagsView() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm, prompt } = useModal();

  const {
    data: tags,
    isLoading,
    isError,
  } = useQuery({ queryKey: queryKeys.tags, queryFn: listTags });
  const catalog = useMemo(() => tags ?? [], [tags]);

  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<TagKind>("free");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (offset > 0 && offset >= catalog.length) {
      setOffset(Math.max(0, (Math.ceil(catalog.length / PAGE_SIZE) - 1) * PAGE_SIZE));
    }
  }, [catalog, offset]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tags });

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await createTag({ name, kind: newKind });
      showToast("Tag added");
      setNewName("");
      invalidate();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  const onToggleKind = async (tag: Tag) => {
    try {
      await updateTag(tag.name, { kind: tag.kind === "purpose" ? "free" : "purpose" });
      invalidate();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  const onRename = async (tag: Tag) => {
    const next = await prompt({
      title: "Rename tag",
      message: `Rename "${tag.name}" to:`,
      value: tag.name,
      confirmLabel: "Rename",
    });
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === tag.name) return;
    try {
      await updateTag(tag.name, { name: trimmed });
      showToast("Tag renamed");
      invalidate();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  const onDelete = async (tag: Tag) => {
    const message =
      tag.count > 0
        ? `Delete "${tag.name}"? It will be removed from ${tag.count} palette${tag.count === 1 ? "" : "s"}.`
        : `Delete "${tag.name}"?`;
    const ok = await confirm({
      title: "Delete tag",
      message,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTag(tag.name);
      showToast("Tag deleted");
      invalidate();
    } catch (err) {
      showToast(errMsg(err), "error");
    }
  };

  const total = catalog.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const pageItems = catalog.slice(offset, offset + PAGE_SIZE);

  return (
    <div className={styles.view}>
      <form className={styles.form} onSubmit={onAdd}>
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className="eyebrow">Tag catalog</p>
            <h2>Add a tag</h2>
          </div>
        </div>
        <div className={styles.tagAddRow}>
          <input
            className={ui.input}
            type="text"
            placeholder="new-tag"
            autoComplete="off"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <CustomSelect
            options={KIND_OPTIONS}
            value={newKind}
            onChange={(v) => setNewKind(v as TagKind)}
            ariaLabel="Tag kind"
          />
          <button className="button button--primary" type="submit">
            Add tag
          </button>
        </div>
        <small className="hint">
          Categories are the standard "what is this palette for" tags (shown first).
        </small>
      </form>

      <section className={styles.list} aria-label="All tags">
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className="eyebrow">Database</p>
            <h2>All tags</h2>
          </div>
          <p className={home.resultCount}>
            {isLoading
              ? "Loading..."
              : isError
                ? "API error"
                : `${total} tag${total === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className={styles.items}>
          {isError ? (
            <EmptyState
              title="Backend is not available"
              text="Start the stack with: docker compose up"
            />
          ) : isLoading ? (
            <EmptyState
              title="Loading tags"
              text="The admin panel is requesting database data."
            />
          ) : total === 0 ? (
            <EmptyState
              title="No tags yet"
              text="Add your first tag using the form above."
            />
          ) : (
            pageItems.map((tag) => (
              <article className={styles.item} key={tag.name}>
                <div className={`${styles.itemTop} ${styles.itemTopTag}`}>
                  <div className={styles.tagItemInfo}>
                    <h3 className={styles.itemTitle}>{tag.name}</h3>
                    <span
                      className={`${styles.tagBadge} ${styles.tagBadgeKind[tag.kind]}`}
                    >
                      {tag.kind === "purpose" ? "Category" : "Tag"}
                    </span>
                    <span className={styles.tagItemCount}>
                      {tag.count} palette{tag.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className={styles.itemActions}>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => void onToggleKind(tag)}
                    >
                      {tag.kind === "purpose" ? "Make tag" : "Make category"}
                    </button>
                    <button
                      className="button button--ghost"
                      type="button"
                      onClick={() => void onRename(tag)}
                    >
                      Rename
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => void onDelete(tag)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className={styles.pagination}>
            <button
              className="button button--ghost"
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              ← Prev
            </button>
            <span className={styles.paginationInfo}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="button button--ghost"
              type="button"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
