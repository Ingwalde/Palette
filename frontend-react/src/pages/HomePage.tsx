import { API_BASE_URL } from "../lib/apiBase";
import styles from "./HomePage.module.css";

export function HomePage() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <p className={styles.eyebrow}>Palette · React + TypeScript</p>
      <h1 id="hero-title" className={styles.title}>
        Find a color palette for your next design project.
      </h1>
      <p className={styles.text}>
        This is the v4.8.0 scaffold of the new React&nbsp;+&nbsp;TypeScript frontend
        (Vite, React Router, TanStack Query). Pages are ported one per release; the
        vanilla build stays live until parity.
      </p>
      <p className={styles.meta}>
        API base: <code>{API_BASE_URL}</code>
      </p>
    </section>
  );
}
