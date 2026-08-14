import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/toast/ToastProvider";
import { PasswordField } from "../components/PasswordField";
import * as auth from "../styles/auth.css";
import { ApiError } from "../lib/http";
import * as ui from "../styles/ui.css";

export function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [registering, setRegistering] = useState(false);

  // Already signed in → nothing to do here.
  useEffect(() => {
    if (isAuthenticated) navigate("/profile", { replace: true });
  }, [isAuthenticated, navigate]);

  const errorMessage = (error: unknown) =>
    error instanceof ApiError ? error.message : "Something went wrong";

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      await login({ username: loginUsername.trim(), password: loginPassword });
      setLoginPassword("");
      showToast("Logged in");
      navigate("/profile");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setLoggingIn(false);
    }
  };

  const onRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    const username = regUsername.trim();
    try {
      await register({
        username,
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      });
      setRegUsername("");
      setRegEmail("");
      setRegPassword("");
      setLoginUsername(username);
      setLoginPassword("");
      showToast("Account created. Check your email for a verification link.");
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <>
      <section className={`section ${auth.pageHero}`}>
        <p className="eyebrow">Authentication</p>
        <h1>Login to Palette</h1>
        <p>
          Use username, email and password authentication. Admin access is connected to
          the admin role.
        </p>
      </section>

      <section className={`section ${auth.layout}`}>
        <form className={auth.card} onSubmit={onLogin}>
          <div>
            <p className="eyebrow">Existing account</p>
            <h2>Login</h2>
            <p className="muted">
              For local admin access, use the admin user from backend/.env.
            </p>
          </div>

          <label className="field">
            <span>Username/Email</span>
            <input
              className={ui.input}
              type="text"
              autoComplete="username"
              required
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
            />
          </label>

          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={loginPassword}
            onChange={setLoginPassword}
            required
          />

          <div className="form-actions">
            <button className="button button--primary" type="submit" disabled={loggingIn}>
              {loggingIn ? "Logging in..." : "Login"}
            </button>
          </div>

          <p className={auth.cardAside}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
        </form>

        <form className={auth.card} onSubmit={onRegister}>
          <div>
            <p className="eyebrow">New account</p>
            <h2>Create account</h2>
            <p className="muted">
              New users are created without admin rights. Admin users are created from
              backend settings.
            </p>
          </div>

          <label className="field">
            <span>Username</span>
            <input
              className={ui.input}
              type="text"
              autoComplete="username"
              required
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
            />
            <small className="hint">
              Use 3–40 characters: letters, numbers, underscore or hyphen.
            </small>
          </label>

          <label className="field">
            <span>Email</span>
            <input
              className={ui.input}
              type="email"
              autoComplete="email"
              required
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <small className="hint">Use a valid email address.</small>
          </label>

          <PasswordField
            label="Password"
            autoComplete="new-password"
            value={regPassword}
            onChange={setRegPassword}
            hint="Minimum 6 characters."
            required
          />

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={registering}
            >
              {registering ? "Creating account..." : "Create account"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
