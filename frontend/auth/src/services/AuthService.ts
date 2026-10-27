import { apiFetch } from "./Api";

type MessageResponse = {
  message: string;
};

type RegisterResponse = MessageResponse & {
  securityCode: string;
};

type LoginRequest = {
  email: string;
  password: string;
};

type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

type ResetPasswordRequest = {
  email: string;
  securityCode: string;
  newPassword: string;
};

export const authService = {
  login(data: LoginRequest) {
    return apiFetch<MessageResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  register(data: RegisterRequest) {
    return apiFetch<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  me() {
    return apiFetch<MessageResponse>("/auth/me", {
      method: "GET",
    });
  },

  logout() {
    return apiFetch<MessageResponse>("/auth/logout", {
      method: "POST",
    });
  },

  resetPassword(data: ResetPasswordRequest) {
    return apiFetch<MessageResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
