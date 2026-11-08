import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { AuthContext, type AuthContextData } from "../../contexts/useAuth";
import { ApiError } from "../../services/Api";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();

  return { ...actual, useNavigate: () => navigate };
});

const securityCode = "DGBX-A1B2-C3D4-E5F6";

function renderResetPassword(overrides: Partial<AuthContextData> = {}) {
  const auth: AuthContextData = {
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(() => Promise.resolve()),
    register: vi.fn(() => Promise.resolve({ message: "ok", securityCode })),
    logout: vi.fn(() => Promise.resolve()),
    checkAuth: vi.fn(() => Promise.resolve()),
    resetPassword: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );

  return auth;
}

async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  newPassword: string,
  confirmation: string,
) {
  await user.type(screen.getByLabelText("Email"), "player@email.com");
  await user.type(screen.getByLabelText("Security code"), securityCode);
  await user.type(screen.getByLabelText("New password"), newPassword);
  await user.type(screen.getByLabelText("Confirm new password"), confirmation);
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("ResetPasswordPage", () => {
  it("does not reach the network when the confirmation does not match", async () => {
    const user = userEvent.setup();
    const auth = renderResetPassword();

    await fillForm(user, "secret1", "secret2");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(auth.resetPassword).not.toHaveBeenCalled();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match",
    );
  });

  it("sends the confirmation along, because the backend requires it", async () => {
    const user = userEvent.setup();
    const auth = renderResetPassword();

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(auth.resetPassword).toHaveBeenCalledWith({
      email: "player@email.com",
      securityCode,
      newPassword: "secret",
      confirmNewPassword: "secret",
    });
  });

  it("announces the success and only then goes to the login", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    renderResetPassword();

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Password reset successfully",
    );

    expect(navigate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(navigate).toHaveBeenCalledWith("/login");
  });

  it("announces a wrong security code and stays on the page", async () => {
    const user = userEvent.setup();

    renderResetPassword({
      resetPassword: vi.fn(() =>
        Promise.reject(new ApiError("Invalid security code", 401)),
      ),
    });

    await fillForm(user, "secret", "secret");
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid security code",
    );

    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not let the browser autofill the security code", () => {
    renderResetPassword();

    expect(screen.getByLabelText("Security code")).toHaveAttribute(
      "autocomplete",
      "off",
    );
  });
});
