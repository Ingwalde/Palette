import { useId, useState } from "react";
import * as styles from "./PasswordField.css";

const eyeOff = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const eye = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}

// Text input with an eye toggle that reveals the value in place.
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete = "current-password",
  hint,
  required,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className={styles.wrapper}>
        <input
          id={id}
          className="input"
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? eye : eyeOff}
        </button>
      </span>
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}
