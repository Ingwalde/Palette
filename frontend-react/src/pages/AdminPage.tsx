import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
} from "react";
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
import { PaletteForm, type PaletteFormValues } from "../components/PaletteForm";
import * as styles from "./AdminPage.css";
import * as ui from "../styles/ui.css";
import * as home from "./HomePage.css";
import { buttonClass } from "../styles/ui";

const PAGE_SIZE = 10;

const errMsg = (e: unknown) =>
  e instanceof ApiError ? e.message : "Something went wrong";

export function AdminPage() {
  const { user, isAuthenticated, isAdmin, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const refreshAccess = () => queryClient.invalidateQueries({ queryKey: queryKeys.auth });

  if (isLoading) return <section className={ui.section} />;

  if (!isAuthenticated || !isAdmin) {
    const title = !isAuthenticated ? "Login required" : "Admin role required";
    const message = !isAuthenticated
      ? "You need to login with an admin account to manage palettes."
      : `User ${user?.username} is logged in, but this account does not have admin access.`;
    return (
      <>
        <AdminHero />
        <section className={`${ui.section} ${styles.access}`}>
          <div className={styles.accessCard}>
            <p className={ui.eyebrow}>Protected area</p>
            <h2>{title}</h2>
            <p className={ui.muted}>{message}</p>
            <div className={ui.formActions}>
              <Link className={buttonClass("primary")} to="/login">
                Go to login
              </Link>
              <button
                className={buttonClass("ghost")}
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
    <section className={`${ui.section} ${ui.pageHero}`}>
      <p className={ui.eyebrow}>Admin</p>
      <h1>Manage palettes</h1>
      <p>
        Admin actions are protected with username/password authentication and an admin
        role.
      </p>
    </section>
  );
}

const MODES = ["palettes", "tags"] as const;
type Mode = (typeof MODES)[number];

function AdminPanel({ username }: { username: string }) {
  const [mode, setMode] = useState<Mode>("palettes");
  const tabRefs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});

  // Arrow keys move between tabs and select as they go, which is the behaviour the tablist
  // role promises. Home and End jump to the ends, as the pattern specifies.
  const onTablistKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = MODES.indexOf(mode);
    let next: Mode | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = MODES[(index + 1) % MODES.length];
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = MODES[(index - 1 + MODES.length) % MODES.length];
    } else if (e.key === "Home") {
      next = MODES[0];
    } else if (e.key === "End") {
      next = MODES[MODES.length - 1];
    }
    if (!next) return;
    e.preventDefault();
    setMode(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <AdminHero />
      <section className={`${ui.section} ${styles.layout}`}>
        <div className={styles.toolbar}>
          <div>
            <p className={ui.eyebrow}>Admin session · {username}</p>
            <h2>Admin panel</h2>
          </div>
          {/*
            A complete tabs pattern, not just the roles. It previously announced itself as a
            tablist and then behaved like two ordinary buttons: nothing named the panel each tab
            controlled, no element claimed to be a panel at all, and the arrow keys a screen
            reader tells the user to press did nothing. axe does not catch that — the markup was
            not invalid, only unfinished.

            So: aria-controls pointing at a real tabpanel, one tab stop for the whole group with
            arrow/Home/End moving between the tabs inside it (the roving tabindex the pattern
            asks for), and focus following selection, because switching tab swaps the panel
            underneath and the keyboard has to end up somewhere that exists.
          */}
          <div
            className={styles.mode}
            role="tablist"
            aria-label="Admin mode"
            data-active={mode}
            onKeyDown={onTablistKeyDown}
          >
            <span className={styles.modePill} aria-hidden="true" />
            {MODES.map((value) => (
              <button
                key={value}
                ref={(el) => {
                  tabRefs.current[value] = el;
                }}
                className={`${styles.modeButton}${mode === value ? ` ${styles.modeButtonActive}` : ""}`}
                type="button"
                role="tab"
                id={`admin-tab-${value}`}
                aria-controls={`admin-panel-${value}`}
                aria-selected={mode === value}
                tabIndex={mode === value ? 0 : -1}
                onClick={() => setMode(value)}
              >
                {value === "palettes" ? "Palettes" : "Tags"}
              </button>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`admin-panel-${mode}`}
          aria-labelledby={`admin-tab-${mode}`}
          tabIndex={-1}
        >
          {mode === "palettes" ? <PalettesView /> : <TagsView />}
        </div>
      </section>
    </>
  );
}

/* ------------------------------- Palettes view ------------------------------ */

function PalettesView() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { confirm } = useModal();

  // The palette being edited, and a nonce that remounts the form so it re-seeds from `editing`
  // (its fields live inside PaletteForm now).
  const [editing, setEditing] = useState<Palette | null>(null);
  const [formNonce, setFormNonce] = useState(0);

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
    setEditing(null);
    setFormNonce((n) => n + 1);
  };

  // Nothing marked the save as in flight, so a second click while the first request was still
  // travelling sent a second create — and the backend resolves the slug collision rather than
  // refusing it, so the result was two near-identical palettes, `ocean` and `ocean-2`, with no
  // error anywhere to say what happened.
  const [saving, setSaving] = useState(false);

  const onSave = async (values: PaletteFormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      if (editing !== null) {
        await updatePalette(editing.id, values);
        showToast("Palette updated");
      } else {
        await createPalette(values);
        showToast("Palette created");
      }
      resetForm();
      invalidateAll();
    } catch (err) {
      showToast(errMsg(err), "error");
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (palette: Palette) => {
    setEditing(palette);
    setFormNonce((n) => n + 1);
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className={styles.view}>
      <PaletteForm
        key={editing ? `edit-${editing.id}` : `new-${formNonce}`}
        initial={
          editing
            ? {
                name: editing.name,
                description: editing.description,
                colors: editing.colors,
                tags: editing.tags,
              }
            : undefined
        }
        submitLabel={editing ? "Update palette" : "Create palette"}
        saving={saving}
        onSubmit={onSave}
        onCancel={editing ? resetForm : undefined}
        cancelLabel="Cancel edit"
        header={
          <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
            <div>
              <p className={ui.eyebrow}>Palette</p>
              <h2>{editing ? "Edit palette" : "Add palette"}</h2>
            </div>
          </div>
        }
      />

      <section className={styles.list} aria-label="Palettes in the database">
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className={ui.eyebrow}>Database</p>
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
          <span className={ui.visuallyHidden}>Search palettes</span>
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
                      className={buttonClass("ghost")}
                      type="button"
                      onClick={() => onEdit(palette)}
                    >
                      Edit
                    </button>
                    <button
                      className={buttonClass("danger")}
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
              className={buttonClass("ghost")}
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
              className={buttonClass("ghost")}
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

  // Same in-flight guard as the palette form. A duplicate tag is refused by the unique
  // constraint rather than silently created, so the second click produced an error toast for
  // something the user did once — which is its own kind of wrong answer.
  const [adding, setAdding] = useState(false);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await createTag({ name, kind: newKind });
      showToast("Tag added");
      setNewName("");
      invalidate();
    } catch (err) {
      showToast(errMsg(err), "error");
    } finally {
      setAdding(false);
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
            <p className={ui.eyebrow}>Tag catalog</p>
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
          <button className={buttonClass("primary")} type="submit" disabled={adding}>
            Add tag
          </button>
        </div>
        <small className={ui.hint}>
          Categories are the standard "what is this palette for" tags (shown first).
        </small>
      </form>

      <section className={styles.list} aria-label="All tags">
        <div className={`${ui.sectionHeading} ${ui.sectionHeadingCompact}`}>
          <div>
            <p className={ui.eyebrow}>Database</p>
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
                      className={buttonClass("ghost")}
                      type="button"
                      onClick={() => void onToggleKind(tag)}
                    >
                      {tag.kind === "purpose" ? "Make tag" : "Make category"}
                    </button>
                    <button
                      className={buttonClass("ghost")}
                      type="button"
                      onClick={() => void onRename(tag)}
                    >
                      Rename
                    </button>
                    <button
                      className={buttonClass("danger")}
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
              className={buttonClass("ghost")}
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
              className={buttonClass("ghost")}
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
