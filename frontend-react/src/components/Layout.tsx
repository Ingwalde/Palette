import { useLayoutEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as styles from "./Layout.css";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

export function Layout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const navRef = useRef<HTMLElement>(null);
  const location = useLocation();

  // Position the sliding indicator pill behind the active nav link. Re-measure on route
  // change, auth change, resize and after fonts load.
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const move = () => {
      const active = nav.querySelector<HTMLElement>(`.${styles.navLinkActive}`);
      if (!active) return;
      nav.style.setProperty("--nav-indicator-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--nav-indicator-y", `${active.offsetTop}px`);
      nav.style.setProperty("--nav-indicator-width", `${active.offsetWidth}px`);
      nav.style.setProperty("--nav-indicator-height", `${active.offsetHeight}px`);
      nav.classList.add(styles.navReady);
    };
    move();
    window.addEventListener("resize", move);
    document.fonts?.ready.then(move).catch(() => {});
    return () => window.removeEventListener("resize", move);
  }, [location.pathname, isAuthenticated, isAdmin]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <NavLink to="/" className={styles.logo} aria-label="Palette home">
          <span className={styles.logoMark}>P</span>
          <span className={styles.logoText}>Palette</span>
        </NavLink>

        <nav className={styles.nav} aria-label="Main navigation" ref={navRef}>
          <span className={styles.navIndicator} aria-hidden="true" />
          <NavLink to="/" end className={linkClass}>
            Home
          </NavLink>
          <NavLink to="/favorites" className={linkClass}>
            Favorites
          </NavLink>
          <NavLink to="/export" className={linkClass}>
            Export
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              Admin
            </NavLink>
          )}
          {isAuthenticated ? (
            <>
              <NavLink to="/profile" className={linkClass}>
                {user?.username}
              </NavLink>
              <button
                type="button"
                className={`${styles.navLink} ${styles.navButton}`}
                onClick={() => void logout()}
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `${styles.navLink} ${styles.navButton}${isActive ? ` ${styles.navLinkActive}` : ""}`
              }
            >
              Login
            </NavLink>
          )}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className={`section ${styles.footer}`}>
        <div className={styles.footerPanel}>
          <div className={styles.footerContent}>
            <p className={styles.footerEyebrow}>Palette v4.8.3</p>
            <p className={styles.footerText}>
              A personal color workspace for finding palettes, saving favorites, managing
              a collection and exporting ready-to-use palette assets.
            </p>
            <div className={styles.footerFeatures} aria-label="Project highlights">
              <span>Personal palette library</span>
              <span>Account-based favorites</span>
              <span>Single palette export</span>
              <span>PNG palette cards</span>
              <span>Admin collection tools</span>
            </div>
          </div>
          {isAdmin && (
            <div className={styles.footerMeta} aria-label="Project links">
              <a href="/api/docs" target="_blank" rel="noreferrer">
                API docs
              </a>
              <NavLink to="/changelog">Changelog</NavLink>
            </div>
          )}
        </div>
      </footer>
    </>
  );
}
