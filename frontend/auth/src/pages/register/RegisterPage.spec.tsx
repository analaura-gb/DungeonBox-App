import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { RegisterPage } from "./RegisterPage";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";
import { ApiError } from "../../services/Api";

const securityCode = "DGBX-A1B2-C3D4-E5F6";

function renderRegister(overrides: Partial<AuthContextData> = {}) {
  const auth: AuthContextData = {
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() =>
      Promise.resolve({
        message: "User registered successfully",
        securityCode,
      }),
    ),
    logout: vi.fn(() => Promise.resolve()),
    checkAuth: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return auth;
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  confirmation: string,
) {
  await user.type(screen.getByLabelText("Username"), "player");
  await user.type(screen.getByLabelText("Email"), "player@email.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.type(screen.getByLabelText("Confirm password"), confirmation);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("RegisterPage", () => {
  it("does not reach the network when the confirmation does not match", async () => {
    const user = userEvent.setup();
    const auth = renderRegister();

    await fillForm(user, "secret1", "secret2");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(auth.register).not.toHaveBeenCalled();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
  });

  it("sends the confirmation along, because the backend requires it", async () => {
    const user = userEvent.setup();
    const auth = renderRegister();

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(auth.register).toHaveBeenCalledWith({
      name: "player",
      email: "player@email.com",
      password: "secret",
      confirmPassword: "secret",
    });
  });

  it("shows the security code once the account exists", async () => {
    const user = userEvent.setup();

    renderRegister();

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByText(securityCode)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "I saved my code" }),
    ).toHaveAttribute("href", "/login");
  });

  it("copies the security code and stops saying Copied after a while", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderRegister();

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    await user.click(await screen.findByRole("button", { name: "Copy" }));

    expect(await navigator.clipboard.readText()).toBe(securityCode);
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("announces a rejected registration and keeps the form", async () => {
    const user = userEvent.setup();

    renderRegister({
      register: vi.fn(() =>
        Promise.reject(new ApiError("Email already registered", 409)),
      ),
    });

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already registered",
    );

    expect(screen.queryByText(securityCode)).not.toBeInTheDocument();
  });

  it("marks every field required and tells the password manager the passwords are new", () => {
    renderRegister();

    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Email")).toBeRequired();
    expect(screen.getByLabelText("Password")).toBeRequired();
    expect(screen.getByLabelText("Confirm password")).toBeRequired();

    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
    expect(screen.getByLabelText("Confirm password")).toHaveAttribute(
      "autocomplete",
      "new-password",
    );
  });
});
