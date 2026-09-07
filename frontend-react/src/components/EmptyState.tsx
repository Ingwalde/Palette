import { Link } from "react-router-dom";
import { buttonClass } from "../styles/ui";
import * as styles from "./EmptyState.css";

// An action is either a link (navigate somewhere) or a button (do something in place, like
// retrying a failed load) — never both.
type EmptyStateAction = { label: string } & (
  { to: string; onClick?: never } | { onClick: () => void; to?: never }
);

interface EmptyStateProps {
  title: string;
  text: string;
  action?: EmptyStateAction;
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <h3>{title}</h3>
      <p>{text}</p>
      {action &&
        (action.to !== undefined ? (
          <Link className={`${buttonClass("primary")} ${styles.action}`} to={action.to}>
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            className={`${buttonClass("primary")} ${styles.action}`}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}
