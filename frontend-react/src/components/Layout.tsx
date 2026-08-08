import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "site-nav__link site-nav__link--active" : "site-nav__link";

export function Layout() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

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

        <nav className="site-nav" aria-label="Main navigation">
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
            <NavLink to="/login" className="site-nav__link site-nav__button">
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
            <p className="site-footer__eyebrow">Palette v4.8.0</p>
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
