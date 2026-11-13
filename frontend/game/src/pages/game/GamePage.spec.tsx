import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GamePage } from "./GamePage";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";

vi.mock("../../components/game/GameView", () => ({
  GameView: () => <p>game view</p>,
}));

function renderGame(overrides: Partial<AuthContextData> = {}) {
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
      <GamePage />
    </AuthContext.Provider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GamePage", () => {
  it("waits for the session check", () => {
    renderGame({ isLoading: true });

    expect(screen.getByText("Checking session...")).toBeInTheDocument();
    expect(screen.queryByText("game view")).not.toBeInTheDocument();
  });

  it("sends signed-out visitors to the auth pages", () => {
    renderGame({ isAuthenticated: false });

    expect(screen.getByRole("heading", { name: "Sign in to play" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      `${import.meta.env.VITE_AUTH_URL}login`,
    );
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      `${import.meta.env.VITE_AUTH_URL}register`,
    );
    expect(screen.queryByText("game view")).not.toBeInTheDocument();
  });

  it("loads the game for signed-in players", async () => {
    renderGame();

    expect(await screen.findByText("game view")).toBeInTheDocument();
  });
});
