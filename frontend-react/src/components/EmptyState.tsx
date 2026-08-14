import { Link } from "react-router-dom";
import { buttonClass } from "../styles/ui";
import * as styles from "./EmptyState.css";

interface EmptyStateProps {
  title: string;
  text: string;
  action?: { label: string; to: string };
}

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Link className={`${buttonClass("primary")} ${styles.action}`} to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
