import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { buttonClass } from "../styles/ui";
import * as styles from "./ActionMenu.css";

/** A disclosure of ordinary actions: Tab navigates, Escape closes and restores the trigger. */
export function ActionMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    if (!open || !root.current || !panel.current) return;
    const container = root.current;
    const menu = panel.current;
    const position = () => {
      const viewport = window.visualViewport;
      const start = (viewport?.offsetLeft ?? 0) + 12;
      const end =
        (viewport?.offsetLeft ?? 0) +
        (viewport?.width ?? document.documentElement.clientWidth) -
        12;
      menu.style.maxWidth = `${Math.max(0, end - start)}px`;
      const anchor = container.getBoundingClientRect();
      const width = menu.getBoundingClientRect().width;
      const left = Math.max(start, Math.min(anchor.left, end - width));
      menu.style.left = `${left - anchor.left}px`;
    };
    position();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(position);
    observer?.observe(container);
    observer?.observe(menu);
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open]);
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
        className={`${buttonClass("ghost")} ${styles.trigger}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      <div
        id={id}
        ref={panel}
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
