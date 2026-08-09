import "@testing-library/jest-dom/vitest";

// jsdom has no layout engine, so Element.scrollIntoView is undefined. HomePage's "Random palette"
// action smooth-scrolls to the result, which otherwise throws asynchronously and surfaces as an
// unhandled error that fails the run in CI. Stub it so scroll calls are inert in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
