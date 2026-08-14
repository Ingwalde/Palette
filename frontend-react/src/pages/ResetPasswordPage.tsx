import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import { useToast } from "../components/toast/ToastProvider";
import { PasswordField } from "../components/PasswordField";
import * as auth from "../styles/auth.css";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";

export function ResetPasswordPage() {
  const { showToast } = useToast();
  const [params] = useSearchParams();
  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSending(true);
    try {
      const res = await resetPassword({
        token: token ?? "",
        new_password: password,
        confirm_password: confirm,
      });
      showToast("Password reset");
      setResult(res.message);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Could not reset the password.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSending(false);
    }
  };

  const Result = ({
    title,
    text,
    label,
    to,
  }: {
    title: string;
    text: string;
    label: string;
    to: string;
  }) => (
    <div className={auth.card}>
      <div className={auth.cardResult}>
        <h2>{title}</h2>
        <p className="muted">{text}</p>
        <Link className="button button--primary" to={to}>
          {label}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <section className={`section ${auth.pageHero}`}>
        <p className="eyebrow">Authentication</p>
        <h1>Choose a new password</h1>
        <p>
          Enter a new password for your account. After resetting, log in with the new
          password.
        </p>
      </section>

      <section className={`section ${auth.layout} ${auth.layoutSingle}`}>
        {!token ? (
          <Result
            title="Reset link is missing"
            text="This password reset link is missing its token. Request a new one."
            label="Request a new link"
            to="/forgot-password"
          />
        ) : result !== null ? (
          <Result title="Password reset" text={result} label="Go to login" to="/login" />
        ) : (
          <form className={auth.card} onSubmit={onSubmit}>
            <div>
              <p className="eyebrow">Reset password</p>
              <h2>New password</h2>
              <p className="muted">
                Your existing sessions will be logged out once the password changes.
              </p>
            </div>

            <PasswordField
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              hint="Minimum 6 characters."
              required
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              required
            />
            {error && (
              <small className="hint" role="alert">
                {error}
              </small>
            )}

            <div className={ui.formActions}>
              <button className="button button--primary" type="submit" disabled={sending}>
                {sending ? "Resetting…" : "Reset password"}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
