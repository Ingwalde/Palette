import { useLayoutEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "site-nav__link site-nav__link--active" : "site-nav__link";

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
      const active = nav.querySelector<HTMLElement>(".site-nav__link--active");
      if (!active) return;
      nav.style.setProperty("--nav-indicator-x", `${active.offsetLeft}px`);
      nav.style.setProperty("--nav-indicator-y", `${active.offsetTop}px`);
      nav.style.setProperty("--nav-indicator-width", `${active.offsetWidth}px`);
      nav.style.setProperty("--nav-indicator-height", `${active.offsetHeight}px`);
      nav.classList.add("site-nav--ready");
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

      <header className="site-header">
        <NavLink to="/" className="logo" aria-label="Palette home">
          <span className="logo__mark">P</span>
          <span className="logo__text">Palette</span>
        </NavLink>

        <nav className="site-nav" aria-label="Main navigation" ref={navRef}>
          <span className="site-nav__indicator" aria-hidden="true" />
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
                className="site-nav__link site-nav__button"
                onClick={() => void logout()}
              >
                Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `site-nav__link site-nav__button${isActive ? " site-nav__link--active" : ""}`
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

      <footer className="site-footer section">
        <div className="site-footer__panel">
          <div className="site-footer__content">
            <p className="site-footer__eyebrow">Palette v4.8.3</p>
            <p className="site-footer__text">
              A personal color workspace for finding palettes, saving favorites, managing
              a collection and exporting ready-to-use palette assets.
            </p>
            <div className="site-footer__features" aria-label="Project highlights">
              <span>Personal palette library</span>
              <span>Account-based favorites</span>
              <span>Single palette export</span>
              <span>PNG palette cards</span>
              <span>Admin collection tools</span>
            </div>
          </div>
          {isAdmin && (
            <div className="site-footer__meta" aria-label="Project links">
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
