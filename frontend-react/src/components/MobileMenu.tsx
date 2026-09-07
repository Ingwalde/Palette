import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import * as styles from "./Layout.css";

interface MobileMenuProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
}

/**
 * The phone-only overflow menu. The full nav does not fit a narrow header, so on mobile Home lives
 * on the logo, Favorites lives on the profile page, the account is a profile avatar, and everything
 * else — Export, Create, the theme and Admin — collapses in here behind a single button.
 */
export function MobileMenu({ isAuthenticated, isAdmin }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const location = useLocation();

  // Close on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  // Close on Escape or a press outside the menu. `pointerdown` (not `mousedown`) so a tap on a bare
  // area of the page closes it on touch too — iOS Safari does not fire mouse events on elements
  // without a click handler, which left the menu stuck open on a phone.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
    <div className={styles.mobileMenuRoot} ref={rootRef}>
      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.mobileMenuIcon} aria-hidden="true" />
      </button>

      {/* A disclosure of links, not an ARIA menu widget (which would demand arrow-key roving) — a
          labelled nav is the honest role for route links. */}
      <nav
        id={panelId}
        className={styles.mobileMenuPanel}
        aria-label="More"
        hidden={!open}
        // Close as soon as a link is chosen, even when it points at the current route (where the
        // navigation effect would not fire). The theme buttons are not links, so they stay open.
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
      >
        <NavLink to="/" end className={itemClass}>
          Home
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
        {isAdmin && (
          <NavLink to="/admin" className={itemClass}>
            Admin
          </NavLink>
        )}
        <div className={styles.mobileMenuDivider} />
        <ThemeToggle />
      </nav>
    </div>
  );
}
