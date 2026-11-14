import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RankingPage } from "./RankingPage";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";
import type { MyStats, RankingEntry } from "../../services/RankingService";

const { getRanking, getMyStats, getCharacters, getCatalog } = vi.hoisted(() => ({
  getRanking: vi.fn(),
  getMyStats: vi.fn(),
  getCharacters: vi.fn(),
  getCatalog: vi.fn(),
}));

vi.mock("../../services/GameService", () => ({
  gameService: { getCatalog },
}));

vi.mock("../../services/RankingService", () => ({
  rankingService: { getRanking, getMyStats },
}));

vi.mock("../../services/StoreService", () => ({
  storeService: { getCharacters },
}));

const characters = [
  { id: "bruno", name: "Bruno", imageUrl: "/assets/characters/bruno-front.png" },
  { id: "enzo", name: "Enzo", imageUrl: null },
];

const myStats: MyStats = {
  position: 2,
  totalRuns: 9,
  totalWins: 2,
  bestScore: 4770,
  bestSurvivedTime: 82,
  totalEnemiesKilled: 1234,
  totalSurvivedTime: 754,
  totalCoinsCollected: 56,
  favoriteCharacter: { id: "bruno", runs: 6 },
};

function entry(position: number, isMe = false): RankingEntry {
  return {
    position,
    runId: `run-${position}`,
    userId: `user-${position}-abcdef`,
    isMe,
    characterId: "enzo",
    score: 10000 - position * 1000,
    survivedTime: 300,
    weapons: [],
    passiveItems: [],
  };
}

function renderRanking(overrides: Partial<AuthContextData> = {}) {
  const auth: AuthContextData = {
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() =>
      Promise.resolve({ message: "ok", securityCode: "DGBX-0000-0000-0000" }),
    ),
    logout: vi.fn(() => Promise.resolve()),
    checkAuth: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  render(
    <AuthContext.Provider value={auth}>
      <RankingPage />
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getRanking.mockResolvedValue([entry(1), entry(2, true), entry(3), entry(4)]);
  getMyStats.mockResolvedValue(myStats);
  getCharacters.mockResolvedValue(characters);
  getCatalog.mockResolvedValue({
    weapons: [{ id: "wifi", name: "Wi-Fi Router", imageUrl: "/assets/weapons/wifi.png" }],
    passiveItems: [{ id: "espresso", name: "Espresso Shot", imageUrl: null }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RankingPage", () => {
  it("sends signed-out visitors to the auth pages without loading the ranking", () => {
    renderRanking({ isAuthenticated: false });

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      `${import.meta.env.VITE_AUTH_URL}login`,
    );
    expect(getRanking).not.toHaveBeenCalled();
  });

  it("shows the player's stats and favorite character", async () => {
    renderRanking();

    expect(await screen.findByText("#2")).toBeInTheDocument();
    expect(screen.getByText("Bruno")).toBeInTheDocument();
    expect(screen.getByText("6 runs")).toBeInTheDocument();
    expect(screen.getByText("runs · 2 graduated")).toBeInTheDocument();
    expect(screen.getByAltText("Bruno")).toHaveAttribute("src", "/assets/characters/bruno-front.png");
  });

  it("names the characters with the store data, falling back to the missing art and the id", async () => {
    getRanking.mockResolvedValue([entry(1), { ...entry(2), characterId: "new-hero" }]);

    renderRanking();

    const rows = (await screen.findAllByRole("row")).slice(1);

    expect(within(rows[0]).getByText("Enzo")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("presentation")).toHaveAttribute("src", `${import.meta.env.BASE_URL}no-art.svg`);
    expect(within(rows[1]).getByText("new-hero")).toBeInTheDocument();
  });

  it("swaps a picture that fails to load for the missing art", async () => {
    renderRanking();

    const picture = await screen.findByAltText("Bruno");
    fireEvent.error(picture);

    expect(picture).toHaveAttribute("src", `${import.meta.env.BASE_URL}no-art.svg`);
  });

  it("shows the build of each run with the weapons and passive items", async () => {
    getRanking.mockResolvedValue([
      {
        ...entry(1),
        weapons: [{ id: "wifi", level: 8 }],
        passiveItems: [{ id: "espresso", level: 3 }],
      },
      entry(2),
    ]);

    renderRanking();

    const rows = (await screen.findAllByRole("row")).slice(1);

    expect(within(rows[0]).getByAltText("Wi-Fi Router level 8")).toHaveAttribute("src", "/assets/weapons/wifi.png");
    expect(within(rows[0]).getByAltText("Espresso Shot level 3")).toHaveAttribute(
      "src",
      `${import.meta.env.BASE_URL}no-art.svg`,
    );
    expect(within(rows[1]).getByText("—")).toBeInTheDocument();
  });

  it("still shows the build by id when the game catalog is down", async () => {
    getCatalog.mockRejectedValue(new Error("offline"));
    getRanking.mockResolvedValue([{ ...entry(1), weapons: [{ id: "wifi", level: 2 }], passiveItems: [] }]);

    renderRanking();

    expect(await screen.findByAltText("wifi level 2")).toBeInTheDocument();
  });

  it("still shows the ranking when the store is down", async () => {
    getCharacters.mockRejectedValue(new Error("offline"));

    renderRanking();

    expect(await screen.findByText("#2")).toBeInTheDocument();
    expect(screen.getByText("bruno")).toBeInTheDocument();
  });

  it("lists the top runs with medals for the podium and marks the player", async () => {
    renderRanking();

    const rows = (await screen.findAllByRole("row")).slice(1);

    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("🥇")).toBeInTheDocument();
    expect(within(rows[1]).getByText("🥈")).toBeInTheDocument();
    expect(within(rows[2]).getByText("🥉")).toBeInTheDocument();
    expect(within(rows[3]).getByText("4")).toBeInTheDocument();
    expect(within(rows[1]).getByText("You")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Player user-1")).toBeInTheDocument();
  });

  it("invites the player to play when there are no runs", async () => {
    getRanking.mockResolvedValue([]);
    getMyStats.mockResolvedValue({ ...myStats, position: null, favoriteCharacter: null });

    renderRanking();

    expect(await screen.findByRole("link", { name: "Play a run" })).toHaveAttribute(
      "href",
      import.meta.env.VITE_GAME_URL,
    );
    expect(screen.getByText("no runs yet")).toBeInTheDocument();
  });

  it("tells the player when the ranking cannot be loaded", async () => {
    getRanking.mockRejectedValue(new Error("offline"));

    renderRanking();

    expect(await screen.findByText(/Couldn't load the ranking/)).toBeInTheDocument();
  });
});
