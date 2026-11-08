import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { LoginPage } from "./LoginPage";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";
import { ApiError } from "../../services/Api";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return { ...actual, useNavigate: () => navigate };
});

function renderLogin(overrides: Partial<AuthContextData> = {}) {
  const auth: AuthContextData = {
    isAuthenticated: false,
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

  const { container } = render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return { ...auth, container };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("sends the typed credentials and moves on", async () => {
    const auth = renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "player@email.com");
    await userEvent.type(screen.getByLabelText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(auth.login).toHaveBeenCalledWith({
      email: "player@email.com",
      password: "secret",
    });

    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("announces a rejected login instead of only coloring it red", async () => {
    renderLogin({
      login: vi.fn(() =>
        Promise.reject(new ApiError("Incorrect password", 401)),
      ),
    });

    await userEvent.type(screen.getByLabelText("Email"), "player@email.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    const alert = await screen.findByRole("alert");

    expect(alert).toHaveTextContent("Incorrect password");
  });

  it("tells the password manager which fields these are", () => {
    renderLogin();

    expect(screen.getByLabelText("Email")).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("marks both fields required, so an empty submit never reaches the network", () => {
    renderLogin();

    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
  });

  it("does not nest one paragraph inside another", () => {
    const { container } = renderLogin();

    expect(container.querySelector("p p")).toBeNull();
  });

  it("offers the way to both sign up and password recovery", () => {
    renderLogin();

    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute(
      "href",
      "/register",
    );
    expect(
      screen.getByRole("link", { name: "Reset password" }),
    ).toHaveAttribute("href", "/reset-password");
  });
});
