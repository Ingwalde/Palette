import { createContext, useContext, useState, type ReactNode } from "react";
import type { ColorFormat } from "../lib/color";

const STORAGE_KEY = "palette:color-format";
const FORMATS: ColorFormat[] = ["hex", "rgb", "hsl", "oklch"];

interface ColorFormatValue {
  format: ColorFormat;
  setFormat: (format: ColorFormat) => void;
}

// A working default (HEX, no-op setter) rather than null, so a component rendered without the
// provider — chiefly in unit tests — reads HEX instead of throwing. The real app always wraps it.
const ColorFormatContext = createContext<ColorFormatValue>({
  format: "hex",
  setFormat: () => {},
});

function isFormat(value: string | null): value is ColorFormat {
  return value !== null && (FORMATS as string[]).includes(value);
}

export function ColorFormatProvider({ children }: { children: ReactNode }) {
  // Lazy initialiser wrapped in try/catch: in some browsers' private mode touching localStorage
  // throws, and a remembered preference is no reason to bring the app down.
  const [format, setFormatState] = useState<ColorFormat>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return isFormat(stored) ? stored : "hex";
    } catch {
      return "hex";
    }
  });

  const setFormat = (next: ColorFormat) => {
    setFormatState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // No persistence available; the in-memory choice still works for this session.
    }
  };

  return (
    <ColorFormatContext.Provider value={{ format, setFormat }}>
      {children}
    </ColorFormatContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useColorFormat(): ColorFormatValue {
  return useContext(ColorFormatContext);
}
