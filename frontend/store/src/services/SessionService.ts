import { apiFetch } from "./Api";

export const sessionService = {
  logout() {
    return apiFetch<{ message: string }>("/auth/logout", { method: "POST" });
  },
};
