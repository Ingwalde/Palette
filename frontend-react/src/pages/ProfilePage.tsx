import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { PasswordField } from "../components/PasswordField";
import { queryKeys } from "../api/queryKeys";
import { changePassword, resendVerification, deleteAccount } from "../api/auth";
import { ApiError } from "../lib/http";

export function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Not signed in → the profile page is not available.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/login", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  if (!user) return null;

  const err = (e: unknown) =>
    e instanceof ApiError ? e.message : "Something went wrong";
  const initial = user.username.charAt(0).toUpperCase() || "U";

  const onResend = async () => {
    setResending(true);
    try {
      const result = await resendVerification(user.email);
      showToast(result.message);
    } catch (e) {
      showToast(err(e), "error");
    } finally {
      setResending(false);
    }
  };

  const hideForm = () => {
    setShowForm(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm)
      return showToast("New password confirmation does not match", "error");
    if (current === next)
      return showToast("New password must be different from current password", "error");
    setSaving(true);
    try {
      await changePassword({
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });
      hideForm();
      showToast("Password changed");
    } catch (e2) {
      showToast(err(e2), "error");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await logout();
    showToast("Logged out");
    navigate("/");
  };

  const onDelete = async () => {
    const password = window.prompt(
      "Deleting your account is permanent and also removes your saved favorites.\n\n" +
        "Enter your password to confirm:",
    );
    if (!password) return;
    setDeleting(true);
    try {
      await deleteAccount(password);
      queryClient.setQueryData(queryKeys.auth, null);
      queryClient.clear();
      showToast("Account deleted");
      navigate("/");
    } catch (e) {
      showToast(err(e), "error");
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="page-hero page-hero--account section">
        <p className="eyebrow">Authentication</p>
        <h1>Personal account</h1>
        <p>
          View your account details, open your saved palettes and manage your session.
        </p>
      </section>

      <section className="section account-layout">
        <article className="account-card">
          <div className="account-card__header">
            <div className="account-avatar" aria-hidden="true">
              {initial}
            </div>
            <div>
              <p className="eyebrow">Logged in as</p>
              <h2>{user.username}</h2>
            </div>
          </div>

          <div className="account-detail">
            <span className="account-detail__label">Email</span>
            <span className="account-detail__value">{user.email}</span>
          </div>

          {!user.email_verified && (
            <div className="verify-banner" role="status">
              <p className="verify-banner__text">
                Your email address isn't verified yet. Check your inbox for the
                confirmation link.
              </p>
              <button
                className="button button--secondary"
                type="button"
                onClick={onResend}
                disabled={resending}
              >
                {resending ? "Sending..." : "Resend link"}
              </button>
            </div>
          )}

          <div className="account-actions">
            <div className="account-actions__main">
              <Link className="button button--primary" to="/favorites">
                Open favorites
              </Link>
              <button
                className="button button--secondary"
                type="button"
                onClick={() => setShowForm(true)}
                disabled={showForm}
              >
                Change password
              </button>
            </div>
            <button
              className="button button--danger account-actions__logout"
              type="button"
              onClick={() => void onLogout()}
            >
              Logout
            </button>
          </div>

          {showForm && (
            <form className="password-form" onSubmit={onChangePassword}>
              <div>
                <p className="eyebrow">Security</p>
                <h3>Change password</h3>
                <p className="muted">
                  Enter your current password and confirm the new password.
                </p>
              </div>

              <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={current}
                onChange={setCurrent}
                required
              />
              <PasswordField
                label="New password"
                autoComplete="new-password"
                value={next}
                onChange={setNext}
                required
              />
              <PasswordField
                label="Confirm new password"
                autoComplete="new-password"
                value={confirm}
                onChange={setConfirm}
                required
              />

              <div className="form-actions">
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save new password"}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={hideForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="account-danger">
            <div>
              <p className="eyebrow">Danger zone</p>
              <p className="muted">
                Deleting your account is permanent and also removes your saved favorites.
              </p>
            </div>
            <button
              className="button button--danger"
              type="button"
              onClick={() => void onDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete account"}
            </button>
          </div>
        </article>
      </section>
    </>
  );
}
