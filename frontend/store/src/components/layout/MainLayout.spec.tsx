import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainLayout } from "./MainLayout";
import { sessionService } from "../../services/SessionService";
import { redirectToAuth } from "../../app/navigation";

vi.mock("../../services/SessionService", () => ({
  sessionService: {
    logout: vi.fn(),
  },
}));

vi.mock("../../app/navigation", () => ({
  redirectToAuth: vi.fn(),
}));

const service = vi.mocked(sessionService);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MainLayout", () => {
  it("opens the protected areas and offers logout when the session is active", () => {
    render(
      <MainLayout isAuthenticated isLoading={false}>
        content
      </MainLayout>,
    );

    expect(screen.getByText("Sessão ativa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logout" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Store" })).toBeInTheDocument();
  });

  it("locks the protected areas when there is no session", () => {
    render(
      <MainLayout isAuthenticated={false} isLoading={false}>
        content
      </MainLayout>,
    );

    expect(screen.queryByText("Sessão ativa")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Logout" }),
    ).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Store" })).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "Store" }),
    ).not.toBeInTheDocument();
  });

  it("does not claim a session while the check has not answered", () => {
    render(
      <MainLayout isAuthenticated={false} isLoading>
        content
      </MainLayout>,
    );

    expect(screen.queryByText("Sessão ativa")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Store" })).toBeDisabled();
  });

  it("keeps auth reachable without a session, so the user can still sign in", () => {
    render(
      <MainLayout isAuthenticated={false} isLoading={false}>
        content
      </MainLayout>,
    );

    expect(screen.getByRole("link", { name: "Auth" })).toBeInTheDocument();
  });

  it("asks the backend to clear the cookie and leaves for auth on logout", async () => {
    service.logout.mockResolvedValue({
      message: "User logged out successfully",
    });

    render(
      <MainLayout isAuthenticated isLoading={false}>
        content
      </MainLayout>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(service.logout).toHaveBeenCalled();
    expect(redirectToAuth).toHaveBeenCalled();
  });

  it("does not strand the user when the logout request fails", async () => {
    service.logout.mockRejectedValue(new Error("network down"));

    render(
      <MainLayout isAuthenticated isLoading={false}>
        content
      </MainLayout>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(redirectToAuth).toHaveBeenCalled();
  });
});
