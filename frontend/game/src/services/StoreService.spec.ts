import { afterEach, describe, expect, it, vi } from "vitest";
import { storeService } from "./StoreService";

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

describe("storeService", () => {
  it("loads every character of the store", async () => {
    const fetchMock = mockFetch([{ id: "ana-laura" }]);

    const characters = await storeService.getCharacters();

    const [url] = fetchMock.mock.calls.at(-1) as unknown as [string];

    expect(url).toBe(`${base}/store/characters`);
    expect(characters).toEqual([{ id: "ana-laura" }]);
  });

  it("loads the characters the player owns", async () => {
    const fetchMock = mockFetch([]);

    await storeService.getOwnedCharacters();

    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe(`${base}/store/me/characters`);
    expect(init.credentials).toBe("include");
  });

  it("loads the power-ups the player owns", async () => {
    const fetchMock = mockFetch([{ id: "coffee-1" }]);

    const powerUps = await storeService.getOwnedPowerUps();

    const [url] = fetchMock.mock.calls.at(-1) as unknown as [string];

    expect(url).toBe(`${base}/store/me/power-ups`);
    expect(powerUps).toEqual([{ id: "coffee-1" }]);
  });
});
