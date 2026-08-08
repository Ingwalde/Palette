import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

// Promise-based confirm/prompt dialogs (ported from the vanilla modal.js) — styled, accessible
// replacements for window.confirm / window.prompt used by the admin destructive actions.
export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: boolean | string | null) => void) | null>(null);

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

  return (
    <ModalContext value={{ confirm, prompt }}>
      {children}
      {state && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) cancel();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-label={state.title}>
            <h2 className="modal__title">{state.title}</h2>
            {state.message && <p className="modal__message">{state.message}</p>}
            {state.isPrompt && (
              <input
                className="input modal__input"
                type="text"
                aria-label={state.title}
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            )}
            <div className="modal__actions">
              <button type="button" className="button button--ghost" onClick={cancel}>
                {state.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                className={`button ${state.danger ? "button--danger" : "button--primary"}`}
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
