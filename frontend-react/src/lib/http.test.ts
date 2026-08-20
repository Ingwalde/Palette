import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { request, ApiError, formatApiError, toQuery } from "./http";

describe("formatApiError", () => {
  it("passes a string detail through", () => {
    expect(formatApiError("Bad thing")).toBe("Bad thing");
  });
  it("joins a validation-error array by msg", () => {
    expect(formatApiError([{ msg: "too short" }, { msg: "required" }])).toBe(
      "too short; required",
    );
  });
  it("reads message from an object detail", () => {
    expect(formatApiError({ message: "nope" })).toBe("nope");
  });
  it("returns empty for undefined", () => {
    expect(formatApiError(undefined)).toBe("");
  });
});

describe("toQuery", () => {
  it("drops undefined/empty and builds a query string", () => {
    expect(toQuery({ search: "sea", tag: undefined, limit: 10, sort: "" })).toBe(
      "?search=sea&limit=10",
    );
    expect(toQuery({})).toBe("");
  });
});

// Minimal fake Response for the mocked fetch.
function res(
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  document.cookie = "csrf_token=tok123";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("http.request", () => {
  it("sends credentials and no CSRF header on a GET, returning parsed JSON", async () => {
    fetchMock.mockResolvedValueOnce(res({ items: [], total: 0, limit: 20, offset: 0 }));

    const data = await request<{ total: number }>("/palettes");

    expect(data.total).toBe(0);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.headers["X-CSRF-Token"]).toBeUndefined();
  });

  it("adds the X-CSRF-Token header from the cookie on a mutating request", async () => {
    fetchMock.mockResolvedValueOnce(res(null, { status: 204 }));

    const result = await request<void>("/favorites/sea-breeze", { method: "POST" });

    expect(result).toBeUndefined();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-CSRF-Token"]).toBe("tok123");
  });

  it("refreshes once on a 401 and retries the original request", async () => {
    fetchMock
      .mockResolvedValueOnce(res({ detail: "expired" }, { ok: false, status: 401 })) // original
      .mockResolvedValueOnce(res(null, { status: 200 })) // /auth/refresh
      .mockResolvedValueOnce(res({ id: 1 }, { status: 200 })); // retry

    const data = await request<{ id: number }>("/auth/me");

    expect(data.id).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
  });

  it("throws an ApiError carrying status and the formatted detail", async () => {
    fetchMock.mockResolvedValue(
      res({ detail: "Palette not found" }, { ok: false, status: 404 }),
    );

    const err = (await request("/palettes/nope").catch((e) => e)) as ApiError;

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.message).toBe("Palette not found");
  });
});

describe("http.request request shaping", () => {
  it("declares a JSON body type only when there is a body", async () => {
    // A Content-Type on a bodyless GET describes a request that does not exist, and sending it
    // unconditionally would also overwrite the boundary a FormData body has to carry.
    fetchMock.mockResolvedValueOnce(res({ ok: true }));
    await request("/palettes");
    expect(fetchMock.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();

    fetchMock.mockResolvedValueOnce(res({ ok: true }));
    await request("/palettes", { method: "POST", body: JSON.stringify({ name: "x" }) });
    expect(fetchMock.mock.calls[1][1].headers["Content-Type"]).toBe("application/json");
  });

  it("attaches an abort signal so a stalled connection cannot hang forever", async () => {
    fetchMock.mockResolvedValueOnce(res({ ok: true }));
    await request("/palettes");
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("lets a caller's own signal win over the timeout", async () => {
    // Nothing passes one today, but a cancellable caller must not silently lose its
    // cancellation to the timeout that was added for everyone else.
    const controller = new AbortController();
    fetchMock.mockResolvedValueOnce(res({ ok: true }));
    await request("/palettes", { signal: controller.signal });
    expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal);
  });
});
