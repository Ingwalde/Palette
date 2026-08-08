import { Link } from "react-router-dom";

interface EmptyStateProps {
  title: string;
  text: string;
  action?: { label: string; to: string };
}

// Ported from the vanilla createEmptyState — same .empty-state markup and optional action link.
export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Link className="button button--primary empty-state__action" to={action.to}>
          {action.label}
        </Link>
      )}
    </div>
  );
}
