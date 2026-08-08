import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../lib/observability";

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

// Catches render-time errors so a bug on one page doesn't blank the whole app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="verify-shell">
        <div className="auth-card auth-card--centered">
          <h1>Something went wrong</h1>
          <p className="muted">
            An unexpected error occurred. Reloading the page usually fixes it.
          </p>
          <div className="form-actions form-actions--centered">
            <button
              className="button button--primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </main>
    );
  }
}
