import styles from "./HomePage.module.css";

// Temporary stand-in for routes not yet ported from the vanilla frontend.
export function PlaceholderPage({ name }: { name: string }) {
  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Coming soon</p>
      <h1 className={styles.title}>{name}</h1>
      <p className={styles.text}>
        This page will be ported from the vanilla frontend in an upcoming 4.8.x release.
      </p>
    </section>
  );
}
