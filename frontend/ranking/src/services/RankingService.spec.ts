import { afterEach, describe, expect, it, vi } from "vitest";
import { rankingService } from "./RankingService";

function mockFetch(body: unknown) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    } as unknown as Response),
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

const base = import.meta.env.VITE_API_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("rankingService", () => {
  it("loads the top runs", async () => {
    const fetchMock = mockFetch([]);

    await rankingService.getRanking();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe(`${base}/ranking`);
    expect(init.credentials).toBe("include");
  });

  it("loads the signed-in player's stats", async () => {
    const fetchMock = mockFetch({});

    await rankingService.getMyStats();

    const [url] = fetchMock.mock.calls[0] as unknown as [string];

    expect(url).toBe(`${base}/ranking/me`);
  });
});
