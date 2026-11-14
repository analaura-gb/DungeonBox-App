import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./Api";

function responseOf(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function unparseableResponse(status: number) {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error("not json")),
  } as unknown as Response;
}

function mockFetch(response: Response) {
  const fetchMock = vi.fn(() => Promise.resolve(response));

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends the session cookie and prefixes the configured base URL", async () => {
    const fetchMock = mockFetch(responseOf(200, { coins: 10 }));

    await apiFetch("/store/me/wallet", { method: "GET" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL}/store/me/wallet`);

    expect(init.credentials).toBe("include");
  });

  it("returns the parsed body", async () => {
    mockFetch(responseOf(200, { coins: 42 }));

    const wallet = await apiFetch<{ coins: number }>("/store/me/wallet");

    expect(wallet).toEqual({ coins: 42 });
  });

  it("throws an ApiError carrying the status", async () => {
    mockFetch(responseOf(401, { message: "Unauthorized" }));

    await expect(apiFetch("/store/me/wallet")).rejects.toMatchObject({
      name: "ApiError",
      message: "Unauthorized",
      status: 401,
    });
  });

  it("uses the first message when the API returns a list of them", async () => {
    mockFetch(
      responseOf(400, {
        message: ["email must be an email", "password is too short"],
      }),
    );

    await expect(apiFetch("/auth/login")).rejects.toThrow(
      "email must be an email",
    );
  });

  it("falls back to the status when the body is not JSON", async () => {
    mockFetch(unparseableResponse(502));

    await expect(apiFetch("/store/power-ups")).rejects.toThrow(
      "Request failed with status 502",
    );
  });

  it("is an Error, so a caller that only knows Error still reads the message", async () => {
    mockFetch(responseOf(404, { message: "Power-up not found" }));

    const reason = await apiFetch("/store/power-ups/x/purchase").catch(
      (error: unknown) => error,
    );

    expect(reason).toBeInstanceOf(ApiError);
    expect(reason).toBeInstanceOf(Error);
  });
});
