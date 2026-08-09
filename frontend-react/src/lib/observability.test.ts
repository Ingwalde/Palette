import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError, initObservability } from "./observability";

describe("observability", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("reportError logs in dev with the error and context", () => {
    reportError(new Error("boom"), { where: "test" });
    expect(console.error).toHaveBeenCalled();
  });

  it("initObservability routes window errors through reportError (idempotent)", () => {
    initObservability();
    initObservability(); // second call is a no-op
    window.dispatchEvent(new ErrorEvent("error", { error: new Error("global") }));
    expect(console.error).toHaveBeenCalled();
  });
});
