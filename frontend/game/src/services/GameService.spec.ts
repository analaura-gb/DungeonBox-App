import { afterEach, describe, expect, it, vi } from "vitest";
import { gameService } from "./GameService";

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

function lastCall(fetchMock: ReturnType<typeof mockFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [
    string,
    RequestInit,
  ];

  return { url, init };
}

const base = import.meta.env.VITE_API_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gameService", () => {
  it("loads the catalog", async () => {
    const fetchMock = mockFetch({
      enemies: [],
      bosses: [],
      pickups: [],
      weapons: [],
      passiveItems: [],
    });

    await gameService.getCatalog();

    expect(lastCall(fetchMock).url).toBe(`${base}/game/catalog`);
  });

  it("starts a run with the chosen character", async () => {
    const fetchMock = mockFetch({ id: "run-1" });

    await gameService.startRun("bruno");

    const { url, init } = lastCall(fetchMock);

    expect(url).toBe(`${base}/game/runs`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ characterId: "bruno" });
  });

  it("sends the result to the run being finished", async () => {
    const fetchMock = mockFetch({ id: "run-1", coinsEarned: 12 });
    const result = {
      won: false,
      score: 1234,
      kills: 80,
      levelReached: 9,
      survivedTime: 240,
      weapons: [{ id: "wifi", level: 3 }],
      passiveItems: [],
    };

    await gameService.finishRun("run-1", result);

    const { url, init } = lastCall(fetchMock);

    expect(url).toBe(`${base}/game/runs/run-1/finish`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(result);
  });

  it("loads the player's best runs", async () => {
    const fetchMock = mockFetch([]);

    await gameService.myBestRuns();

    expect(lastCall(fetchMock).url).toBe(`${base}/game/runs/me`);
  });
});
