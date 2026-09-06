import { useTheme } from "./ThemeContext";
import type { Theme } from "../lib/theme";
import * as styles from "./Layout.css";

const OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: "system", label: "Auto", hint: "Match the system theme" },
  { value: "light", label: "Light", hint: "Light theme" },
  { value: "dark", label: "Dark", hint: "Dark theme" },
];

/** A three-state System / Light / Dark segmented control for the header. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={styles.themeToggle} role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.themeOption}
          aria-pressed={theme === option.value}
          title={option.hint}
          onClick={() => setTheme(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
