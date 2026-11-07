import { createContext, useContext } from "react";

export type LoginData = {
  email: string;
  password: string;
};

export type RegisterData = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message: string;
  securityCode: string;
};

export type ResetPasswordData = {
  email: string;
  securityCode: string;
  newPassword: string;
};

export type AuthContextData = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
};

export const AuthContext = createContext<AuthContextData | undefined>(
  undefined,
);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
