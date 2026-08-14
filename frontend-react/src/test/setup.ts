import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/dom";

// Testing Library gives `findBy*` and `waitFor` one second. That is generous on an idle
// machine and not enough on a loaded one: Vitest runs the 23 files across parallel workers, and
// on a busy laptop or a two-core CI runner a component waiting on a resolved TanStack Query
// promise can lose the race. The symptom is a "unable to find element" failure that never
// reproduces when the file runs alone. Five seconds costs nothing when the element appears
// immediately, which is the normal case.
configure({ asyncUtilTimeout: 5000 });

// jsdom has no layout engine, so Element.scrollIntoView is undefined. HomePage's "Random palette"
// action smooth-scrolls to the result, which otherwise throws asynchronously and surfaces as an
// unhandled error that fails the run in CI. Stub it so scroll calls are inert in tests.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
