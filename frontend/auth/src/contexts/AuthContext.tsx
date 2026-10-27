import { useCallback, useEffect, useState, type ReactNode } from "react";

import { authService } from "../services/AuthService";
import {
  AuthContext,
  type LoginData,
  type RegisterData,
  type RegisterResponse,
  type ResetPasswordData,
} from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIsAuthenticated = useCallback(
    () =>
      authService
        .me()
        .then(() => true)
        .catch(() => false),
    [],
  );

  const checkAuth = useCallback(async () => {
    setIsAuthenticated(await fetchIsAuthenticated());
    setIsLoading(false);
  }, [fetchIsAuthenticated]);

  async function login(data: LoginData) {
    try {
      await authService.login(data);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
      throw error;
    }
  }

  function register(data: RegisterData): Promise<RegisterResponse> {
    return authService.register(data);
  }

  async function logout() {
    try {
      await authService.logout();
    } finally {
      setIsAuthenticated(false);
    }
  }

  async function resetPassword(data: ResetPasswordData) {
    await authService.resetPassword(data);
  }

  useEffect(() => {
    let active = true;

    void fetchIsAuthenticated().then((authenticated) => {
      if (!active) return;

      setIsAuthenticated(authenticated);
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [fetchIsAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        checkAuth,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
