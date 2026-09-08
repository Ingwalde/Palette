import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import * as styles from "./Layout.css";

const SunIcon = (
  <svg
    className={styles.themeOptionIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = (
  <svg
    className={styles.themeOptionIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const OPTIONS = [
  { value: "light" as const, label: "Light", hint: "Light theme", icon: SunIcon },
  { value: "dark" as const, label: "Dark", hint: "Dark theme", icon: MoonIcon },
];

/** Read the OS preference so a visitor who has not chosen still lands on the matching option. */
function useSystemTheme(): "light" | "dark" {
  const [pref, setPref] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setPref(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return pref;
}

/**
 * A two-state Light / Dark segmented control. There is no explicit "Auto": a visitor who has never
 * chosen still follows the OS (the stored theme stays "system" internally), and the toggle simply
 * highlights whichever of Light/Dark the OS currently resolves to. Clicking either pins that choice.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const systemTheme = useSystemTheme();
  const active = theme === "system" ? systemTheme : theme;

  return (
    <div className={styles.themeToggle} role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.themeOption}
          aria-pressed={active === option.value}
          title={option.hint}
          onClick={() => setTheme(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
