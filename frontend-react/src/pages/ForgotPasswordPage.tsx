import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import { useToast } from "../components/toast/ToastProvider";
import { useBodyClass } from "../lib/useBodyClass";
import { ApiError } from "../lib/http";

export function ForgotPasswordPage() {
  useBodyClass("auth-page");
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!value) {
      setError("Enter your account email.");
      return;
    }
    setSending(true);
    try {
      const res = await forgotPassword(value);
      setResult(res.message);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not send the link. Try again later.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="page-hero page-hero--auth section">
        <p className="eyebrow">Authentication</p>
        <h1>Forgot your password?</h1>
        <p>
          Enter your account email and we'll send you a link to choose a new password.
        </p>
      </section>

      <section className="section auth-layout auth-layout--single">
        {result !== null ? (
          <div className="auth-card">
            <div className="auth-card__result">
              <h2>Check your inbox</h2>
              <p className="muted">{result}</p>
              <Link className="button button--primary" to="/login">
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="auth-card" onSubmit={onSubmit}>
            <div>
              <p className="eyebrow">Reset password</p>
              <h2>Send reset link</h2>
              <p className="muted">
                The link is valid for a limited time and can be used once.
              </p>
            </div>

            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <small className="hint" role="alert">
                {error}
              </small>
            </label>

            <div className="form-actions">
              <button className="button button--primary" type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send reset link"}
              </button>
            </div>

            <p className="auth-card__aside">
              <Link to="/login">Back to login</Link>
            </p>
          </form>
        )}
      </section>
    </>
  );
}
