import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import * as styles from "./Layout.css";

interface MobileMenuProps {
  isAdmin: boolean;
  username: string;
  isAuthenticated?: boolean;
  avatarUrl?: string | null;
}

/** Mobile navigation is available to every visitor; account links depend on the session. */
export function MobileMenu({
  isAdmin,
  username,
  avatarUrl,
  isAuthenticated = true,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // Close on navigation.
  useEffect(() => setOpen(false), [location.key]);

  // Close on Escape or a press outside the menu. `pointerdown` (not `mousedown`) so a tap on a bare
  // area of the page closes it on touch too — iOS Safari does not fire mouse events on elements
  // without a click handler, which left the menu stuck open on a phone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: Event) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? `${styles.mobileMenuItem} ${styles.mobileMenuItemActive}`
      : styles.mobileMenuItem;

  return (
    <div
      className={styles.mobileMenuRoot}
      ref={rootRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        className={styles.avatarButton}
        ref={triggerRef}
        aria-label={isAuthenticated ? `Account menu, ${username}` : "Open navigation"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {!isAuthenticated ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        ) : avatarUrl ? (
          <img className={styles.avatarImage} src={avatarUrl} alt="" />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </button>

      {/* A disclosure of links, not an ARIA menu widget (which would demand arrow-key roving) — a
          labelled nav is the honest role for route links. */}
      <nav
        id={panelId}
        className={styles.mobileMenuPanel}
        aria-label={isAuthenticated ? "Account" : "Mobile navigation"}
        hidden={!open}
        inert={!open}
        // Close as soon as a link is chosen, even when it points at the current route (where the
        // navigation effect would not fire). The theme buttons are not links, so they stay open.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <NavLink to="/" end className={itemClass}>
          Browse
        </NavLink>
        <NavLink to="/favorites" className={itemClass}>
          Favorites
        </NavLink>
        <NavLink to="/export" className={itemClass}>
          Export
        </NavLink>
        {isAuthenticated && (
          <NavLink
            to="/palettes/new"
            className={({ isActive }) =>
              isActive || location.pathname === "/import"
                ? `${styles.mobileMenuItem} ${styles.mobileMenuItemActive}`
                : styles.mobileMenuItem
            }
          >
            Create
          </NavLink>
        )}
        {isAuthenticated && (
          <NavLink to="/palettes/mine" className={itemClass}>
            Your palettes
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin" className={itemClass}>
            Admin
          </NavLink>
        )}
        {isAuthenticated ? (
          <NavLink to="/profile" className={itemClass}>
            Account
          </NavLink>
        ) : (
          <NavLink to="/login" state={{ from: location }} className={itemClass}>
            Login / Create account
          </NavLink>
        )}
        <div className={styles.mobileMenuDivider} />
        <ThemeToggle />
      </nav>
    </div>
  );
}
