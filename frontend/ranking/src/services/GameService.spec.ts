import { afterEach, describe, expect, it, vi } from "vitest";
import { gameService } from "./GameService";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameService", () => {
  it("loads the weapons and passive items of the game", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ weapons: [], passiveItems: [] }),
      } as unknown as Response),
    );
    vi.stubGlobal("fetch", fetchMock);

    const catalog = await gameService.getCatalog();

    const [url] = fetchMock.mock.calls.at(-1) as unknown as [string];

    expect(url).toBe(`${import.meta.env.VITE_API_BASE_URL}/game/catalog`);
    expect(catalog).toEqual({ weapons: [], passiveItems: [] });
  });
});
