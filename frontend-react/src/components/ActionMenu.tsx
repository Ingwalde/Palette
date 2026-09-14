import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { buttonClass } from "../styles/ui";
import * as styles from "./ActionMenu.css";

/** A disclosure of ordinary actions: Tab navigates, Escape closes and restores the trigger. */
export function ActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className={styles.root}
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={trigger}
        className={buttonClass("ghost")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        {label} <span aria-hidden="true">⌄</span>
      </button>
      <div
        id={id}
        className={styles.panel}
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, a")) {
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
