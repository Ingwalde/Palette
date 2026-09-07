import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as styles from "./Toast.css";

type ToastKind = "info" | "error";
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

// Errors linger long enough to read and act on; routine confirmations clear quickly. Both pause
// while the pointer or keyboard focus is on the stack, so a toast can never time out from under
// someone who is reading it.
const DURATION: Record<ToastKind, number> = { error: 6000, info: 3000 };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // Per-toast dismissal timers, plus the wall-clock deadline each is counting toward, so a pause
  // can bank the time remaining and a resume can reschedule from it.
  const timers = useRef(new Map<number, number>());
  const deadlines = useRef(new Map<number, number>());
  const paused = useRef(false);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    deadlines.current.delete(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const schedule = useCallback(
    (id: number, ms: number) => {
      deadlines.current.set(id, Date.now() + ms);
      const timer = window.setTimeout(() => dismiss(id), ms);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const showToast = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, kind }]);
      // A toast raised while the stack is held waits for the release rather than starting to run.
      if (!paused.current) schedule(id, DURATION[kind]);
      else deadlines.current.set(id, Date.now() + DURATION[kind]);
    },
    [schedule],
  );

  const pause = useCallback(() => {
    if (paused.current) return;
    paused.current = true;
    const now = Date.now();
    for (const [id, timer] of timers.current) {
      window.clearTimeout(timer);
      // Bank whatever is left so the resume gives a full remaining read, never less.
      const remaining = Math.max(0, (deadlines.current.get(id) ?? now) - now);
      deadlines.current.set(id, remaining);
    }
    timers.current.clear();
  }, []);

  const resume = useCallback(() => {
    if (!paused.current) return;
    paused.current = false;
    for (const [id, remaining] of deadlines.current) {
      schedule(id, remaining);
    }
  }, [schedule]);

  // Clear every outstanding timer if the provider unmounts.
  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) window.clearTimeout(timer);
    };
  }, []);

  const infos = toasts.filter((t) => t.kind === "info");
  const errors = toasts.filter((t) => t.kind === "error");

  const renderToast = (t: Toast) => (
    <div
      key={t.id}
      className={`${styles.toast}${t.kind === "error" ? ` ${styles.error}` : ""}`}
    >
      <span className={styles.message}>{t.message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss notification"
        onClick={() => dismiss(t.id)}
      >
        ✕
      </button>
    </div>
  );

  return (
    <ToastContext value={{ showToast }}>
      {children}
      {/* Holding the pointer or keyboard focus anywhere on the stack pauses the timers. */}
      <div
        className={styles.container}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={resume}
      >
        {/* Errors are assertive and announced as alerts; routine info is a polite status. Split
            so an error interrupts the screen reader while a "Copied" does not. aria-atomic is
            gone: each toast should be read on its own, not the whole stack re-read on every add. */}
        <div role="alert" aria-live="assertive">
          {errors.map(renderToast)}
        </div>
        <div role="status" aria-live="polite">
          {infos.map(renderToast)}
        </div>
      </div>
    </ToastContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
