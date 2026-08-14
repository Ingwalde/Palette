import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { verifyEmail, resendVerification } from "../api/auth";
import { queryKeys } from "../api/queryKeys";
import * as auth from "../styles/auth.css";
import { ApiError } from "../lib/http";
import type { User } from "../types/api";
import * as layout from "../components/Layout.css";
import * as ui from "../styles/ui.css";
import { buttonClass } from "../styles/ui";

const SUCCESS_LINES = [
  "Boom — inbox conquered. You're in and ready to collect colors.",
  "Email confirmed and you're already signed in. Let's go make something bright.",
  "That's the one. You're verified, logged in, and the palettes are waiting.",
  "Handshake complete. Your account is live — time to hoard some gradients.",
];

type State =
  | { status: "pending" }
  | { status: "success"; user: User; line: string }
  | { status: "error"; message: string };

export function VerifyPage() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>({ status: "pending" });
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resentMessage, setResentMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke guard — verify token only once
    ran.current = true;
    const token = params.get("token");
    if (!token) {
      setState({
        status: "error",
        message: "This verification link is missing its token.",
      });
      return;
    }
    verifyEmail(token)
      .then((user) => {
        queryClient.setQueryData(queryKeys.auth, user);
        setState({
          status: "success",
          user,
          line: SUCCESS_LINES[Math.floor(Math.random() * SUCCESS_LINES.length)],
        });
      })
      .catch((error) => {
        const message =
          error instanceof ApiError ? error.message : "We could not verify your email.";
        setState({ status: "error", message });
      });
  }, [params, queryClient]);

  const onResend = async () => {
    const value = email.trim().toLowerCase();
    if (!value) return;
    setResending(true);
    try {
      const result = await resendVerification(value);
      setResentMessage(result.message);
    } catch (error) {
      setResentMessage(
        error instanceof ApiError
          ? error.message
          : "Could not send the link. Try again later.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <header className={`${layout.header} ${layout.headerBare}`}>
        <Link className={layout.logo} to="/" aria-label="Palette home">
          <span className={layout.logoMark}>P</span>
          <span className={layout.logoText}>Palette</span>
        </Link>
      </header>

      <main className={auth.verifyShell}>
        <div className={`${auth.card} ${auth.verifyCard}`}>
          {state.status === "pending" && (
            <>
              <h1>Verifying your email…</h1>
              <p className={ui.muted}>Please wait a moment.</p>
            </>
          )}

          {state.status === "success" && (
            <>
              <h1>You're in, {state.user.username}! 🎉</h1>
              <p className={ui.muted}>{state.line}</p>
              <div className={`${ui.formActions} ${ui.formActionsCentered}`}>
                <Link className={buttonClass("primary")} to="/profile">
                  Go to my account
                </Link>
              </div>
            </>
          )}

          {state.status === "error" && (
            <>
              <h1>Verification failed</h1>
              <p className={ui.muted}>
                {resentMessage ||
                  `${state.message} The link may be invalid or expired — request a new one below.`}
              </p>
              <div className={`${ui.formActions} ${ui.formActionsCentered}`}>
                <input
                  className={ui.input}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button
                  className={buttonClass("primary")}
                  type="button"
                  onClick={onResend}
                  disabled={resending}
                >
                  {resending ? "Sending…" : "Resend link"}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
