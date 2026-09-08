import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import * as styles from "./TaskRouter.css";

interface Task {
  to: string;
  title: string;
  blurb: string;
  icon: ReactNode;
}

const SearchIcon = (
  <svg
    className={styles.iconGlyph}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const ImageIcon = (
  <svg
    className={styles.iconGlyph}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8.5" cy="8.5" r="1.6" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

const CreateIcon = (
  <svg
    className={styles.iconGlyph}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const TASKS: Task[] = [
  {
    to: "#palettes",
    title: "Browse & search",
    blurb: "Explore the community's palettes by name, tag or colour.",
    icon: SearchIcon,
  },
  {
    to: "/import",
    title: "Import from image",
    blurb: "Pull a ready palette out of any photo or screenshot.",
    icon: ImageIcon,
  },
  {
    to: "/palettes/new",
    title: "Create your own",
    blurb: "Pick colours, tag them, and save to your account.",
    icon: CreateIcon,
  },
];

/** The three ways into the app, shown as one clear choice so a first-time visitor picks an intent
 * instead of guessing where to click. */
export function TaskRouter() {
  return (
    <nav className={styles.router} aria-label="Get started">
      {TASKS.map((task) => {
        const body = (
          <>
            <span className={styles.icon} aria-hidden="true">
              {task.icon}
            </span>
            <span className={styles.title}>
              {task.title}
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </span>
            <p className={styles.blurb}>{task.blurb}</p>
          </>
        );
        // A same-page hash ("#palettes") scrolls to the feed below; everything else is a route.
        return task.to.startsWith("#") ? (
          <a key={task.to} href={task.to} className={styles.card}>
            {body}
          </a>
        ) : (
          <Link key={task.to} to={task.to} className={styles.card}>
            {body}
          </Link>
        );
      })}
    </nav>
  );
}
