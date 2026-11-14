import { afterEach, describe, expect, it, vi } from "vitest";
import { storeService } from "./StoreService";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storeService", () => {
  it("loads the characters of the store", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([{ id: "enzo" }]),
      } as unknown as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const characters = await storeService.getCharacters();

    const [url] = fetchMock.mock.calls.at(-1) as unknown as [string];

    expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL}/store/characters`);
    expect(characters).toEqual([{ id: "enzo" }]);
  });
});
