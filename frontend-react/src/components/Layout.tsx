import { NavLink, Outlet } from "react-router-dom";
import styles from "./Layout.module.css";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/favorites", label: "Favorites" },
  { to: "/export", label: "Export" },
  { to: "/admin", label: "Admin" },
];

export function Layout() {
  return (
    <div className={styles.shell}>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo} aria-label="Palette home">
          <span className={styles.mark}>P</span>
          <span>Palette</span>
        </NavLink>
        <nav className={styles.nav} aria-label="Main navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/login" className={styles.link}>
            Login
          </NavLink>
        </nav>
      </header>
      <main id="main" className={styles.main} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
