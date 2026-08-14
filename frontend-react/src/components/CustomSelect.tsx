import { useEffect, useId, useRef, useState } from "react";
import * as styles from "./CustomSelect.css";

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

// Accessible listbox: keyboard support, outside-click close, and a chevron drawn in CSS.
export function CustomSelect({ options, value, onChange, ariaLabel }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const labelId = useId();

  const selected = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const focusOption = (index: number) => {
    const clamped = Math.max(0, Math.min(index, options.length - 1));
    optionRefs.current[clamped]?.focus();
  };

  const openMenu = () => {
    setOpen(true);
    const selectedIndex = Math.max(
      0,
      options.findIndex((o) => o.value === value),
    );
    requestAnimationFrame(() => focusOption(selectedIndex));
  };

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div
      className={`${styles.root}${open ? ` ${styles.rootOpen}` : ""}`}
      ref={wrapperRef}
    >
      <button
        type="button"
        className={styles.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(e) => {
          if (["Enter", " ", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            openMenu();
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      >
        <span className={styles.label} id={labelId}>
          {selected?.label}
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>

      <div
        className={styles.menu}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!open}
      >
        {options.map((option, i) => {
          const isSelected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              className={`${styles.option}${isSelected ? ` ${styles.optionSelected}` : ""}`}
              role="option"
              aria-selected={isSelected}
              data-value={option.value}
              onClick={() => select(option.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  setOpen(false);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  focusOption(i + 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  focusOption(i - 1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  focusOption(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  focusOption(options.length - 1);
                } else if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  select(option.value);
                }
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
