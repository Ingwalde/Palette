import * as styles from "./PaletteCardSkeleton.css";

/** A placeholder in the shape of a PaletteCard, shown while the list loads instead of a line of
 * text — so the layout does not jump when the real cards arrive. Decorative, hidden from the
 * accessibility tree; the list's own status text announces loading. */
export function PaletteCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={styles.title} />
      <div className={styles.line} />
      <div className={styles.swatches} />
      <div className={styles.footer} />
    </div>
  );
}

/** A grid-worth of skeletons for a loading list. */
export function PaletteCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <PaletteCardSkeleton key={i} />
      ))}
    </>
  );
}
