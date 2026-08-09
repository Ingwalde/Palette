import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the Sentry SDK so the lazy dynamic import inside initObservability resolves to spies.
const init = vi.fn();
const captureException = vi.fn();
vi.mock("@sentry/react", () => ({
  init,
  browserTracingIntegration: vi.fn(() => ({ name: "BrowserTracing" })),
  captureException,
}));

describe("observability with a Sentry DSN", () => {
  beforeEach(() => {
    vi.resetModules(); // fresh module state so the `installed` guard + lazy import re-run
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("VITE_SENTRY_DSN", "https://key@o0.ingest.sentry.io/1");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("initializes Sentry and forwards reported errors as exceptions", async () => {
    const mod = await import("./observability");
    mod.initObservability();
    await vi.waitFor(() => expect(init).toHaveBeenCalledOnce());
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({ dsn: "https://key@o0.ingest.sentry.io/1" }),
    );

    mod.reportError(new Error("boom"), { where: "test" });
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { where: "test" },
    });
  });
});
