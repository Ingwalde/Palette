import { Suspense, useLayoutEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { RouteAnnouncer } from "./RouteAnnouncer";
import { RouteFallback } from "./RouteFallback";
import * as styles from "./Layout.css";
import * as ui from "../styles/ui.css";

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
      <a className={ui.skipLink} href="#main-content">
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

      {/* tabIndex -1 so the skip link and the route change can both put focus here; it is not
          in the tab order itself. */}
      <main id="main-content" tabIndex={-1}>
        {/* The boundary sits inside <main>, not around the whole shell, so a route chunk
            arriving never blanks the header, nav and footer the user is already looking at. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>

      <RouteAnnouncer mainId="main-content" />

      <footer className={`${ui.section} ${styles.footer}`}>
        <div className={styles.footerPanel}>
          <div className={styles.footerContent}>
            <p className={styles.footerEyebrow}>Palette v4.8.5</p>
            <p className={styles.footerText}>
              A personal color workspace for finding palettes, saving favorites, managing
              a collection and exporting ready-to-use palette assets.
            </p>
            {/* A labelled div has no role, so the label is dropped. These are a list. */}
            <div
              className={styles.footerFeatures}
              role="list"
              aria-label="Project highlights"
            >
              <span role="listitem">Personal palette library</span>
              <span role="listitem">Account-based favorites</span>
              <span role="listitem">Single palette export</span>
              <span role="listitem">PNG palette cards</span>
              <span role="listitem">Admin collection tools</span>
            </div>
          </div>
          {isAdmin && (
            <div className={styles.footerMeta} role="group" aria-label="Project links">
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
