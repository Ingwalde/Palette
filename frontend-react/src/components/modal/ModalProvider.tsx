import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as styles from "./Modal.css";
import * as ui from "../../styles/ui.css";
import { buttonClass } from "../../styles/ui";

interface BaseOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
interface PromptOptions extends BaseOptions {
  value?: string;
}

interface ModalState extends BaseOptions {
  isPrompt: boolean;
}

interface ModalContextValue {
  confirm: (options: BaseOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// Promise-based confirm/prompt dialogs: accessible replacements for window.confirm and
// window.prompt, used by the admin destructive actions.
export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: boolean | string | null) => void) | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (options: BaseOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve as (v: boolean | string | null) => void;
        setState({ ...options, isPrompt: false });
      }),
    [],
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        resolveRef.current = resolve as (v: boolean | string | null) => void;
        setInputValue(options.value ?? "");
        setState({ ...options, isPrompt: true });
      }),
    [],
  );

  const close = useCallback((result: boolean | string | null) => {
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  }, []);

  const cancel = useCallback(() => close(state?.isPrompt ? null : false), [close, state]);
  const accept = useCallback(
    () => close(state?.isPrompt ? inputValue.trim() : true),
    [close, state, inputValue],
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      else if (e.key === "Enter") {
        e.preventDefault();
        accept();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, cancel, accept]);

  /**
   * Keeps the keyboard inside the dialog while it is open, and hands focus back afterwards.
   *
   * `aria-modal="true"` alone does not do this. It tells assistive technology to treat the
   * rest of the page as inert, but the browser still walks Tab straight out of the dialog and
   * into the buttons behind the overlay — where a sighted keyboard user cannot see what is
   * focused and a screen reader has been told nothing is there. Confirm dialogs got no focus
   * at all before this: `autoFocus` sat on the prompt's input, so the destructive
   * "Delete palette" dialog opened with focus still on the list button behind it.
   *
   * Cancel is focused first rather than confirm, so Enter or Space on a dialog that appeared
   * unexpectedly dismisses it instead of carrying out the deletion.
   */
  useEffect(() => {
    if (!state) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'input:not([disabled]), button:not([disabled]), [href], select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );

    // The prompt's text input is the point of the dialog; a confirm starts on the safe action.
    const initial = state.isPrompt ? focusable()[0] : cancelRef.current;
    initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // Wrap at both ends, and pull focus back in if it has escaped the dialog entirely.
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      dialog.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keydown", onKeyDown);
      // Back to whatever opened the dialog, so the list does not dump the user at the top of
      // the document after every delete.
      opener?.focus();
    };
  }, [state]);

  return (
    <ModalContext value={{ confirm, prompt }}>
      {children}
      {state && (
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
          >
            <h2 className={styles.title}>{state.title}</h2>
            {state.message && <p className={styles.message}>{state.message}</p>}
            {state.isPrompt && (
              <input
                className={`${ui.input} ${styles.input}`}
                type="text"
                aria-label={state.title}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <div className={styles.actions}>
              <button
                ref={cancelRef}
                type="button"
                className={buttonClass("ghost")}
                onClick={cancel}
              >
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={buttonClass(state.danger ? "danger" : "primary")}
                onClick={accept}
              >
                {state.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within a ModalProvider");
  return ctx;
}
