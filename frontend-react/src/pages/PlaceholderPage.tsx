// Temporary stand-in for routes not yet ported from the vanilla frontend.
export function PlaceholderPage({ name }: { name: string }) {
  return (
    <section className="section page-hero">
      <p className="eyebrow">Coming soon</p>
      <h1>{name}</h1>
      <p>This page will be ported from the vanilla frontend in an upcoming 4.8 change.</p>
    </section>
  );
}
