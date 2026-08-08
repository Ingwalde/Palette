import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { request, ApiError } from "./http";

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
