import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MainLayout } from "./MainLayout";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";

function renderLayout(overrides: Partial<AuthContextData> = {}) {
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
      <MainLayout>
        <p>page content</p>
      </MainLayout>
    </AuthContext.Provider>,
  );

  return auth;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MainLayout", () => {
  it("renders the page inside the layout", () => {
    renderLayout();

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("opens and closes the small-screen menu", async () => {
    const user = userEvent.setup();
    renderLayout();

    expect(screen.getAllByRole("navigation", { name: "Services" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getAllByRole("navigation", { name: "Services" })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Close menu" }));

    expect(screen.getAllByRole("navigation", { name: "Services" })).toHaveLength(1);
  });

  it("logs out from the header", async () => {
    const user = userEvent.setup();
    const auth = renderLayout();

    await user.click(screen.getByRole("button", { name: "Logout" }));

    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it("keeps the protected services disabled without a session", () => {
    renderLayout({ isAuthenticated: false });

    expect(screen.getByRole("link", { name: "Auth" })).toHaveAttribute(
      "href",
      import.meta.env.VITE_AUTH_URL,
    );
    expect(screen.getByRole("button", { name: "Game" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Logout" })).not.toBeInTheDocument();
  });
});
