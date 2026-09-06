import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyTheme, persistTheme, readStoredTheme, type Theme } from "../lib/theme";

export type { Theme };

interface ThemeValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// A working default (system, no-op setter) rather than null, so a component rendered without the
// provider — chiefly in unit tests — behaves instead of throwing. The real app always wraps it.
const ThemeContext = createContext<ThemeValue>({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  // Keep the document attribute in step with state. theme-init.js has already run for the stored
  // value; this covers changes and the case where the script was skipped.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    persistTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
