import { NavLink } from "react-router-dom";
import * as styles from "./CreateTabs.css";

const TABS = [
  { to: "/palettes/new", label: "New palette" },
  { to: "/import", label: "Import" },
];

/** The two ways to make a palette — a blank editor or an import — as one tab strip, shown at the
 * top of both pages so they read as a single "Create" flow. */
export function CreateTabs() {
  // Route links, not in-page tabs — a labelled nav, so no ARIA tab/tabpanel roles (which axe would
  // flag without a matching panel). The active link carries aria-current from NavLink.
  return (
    <nav className={styles.tabs} aria-label="Create a palette">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          className={({ isActive }) =>
            isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
