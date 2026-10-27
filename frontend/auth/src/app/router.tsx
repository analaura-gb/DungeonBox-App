import { createBrowserRouter } from "react-router";
import { WelcomePage } from "../pages/welcome/WelcomePage";
import { LoginPage } from "../pages/login/LoginPage";
import { RegisterPage } from "../pages/register/RegisterPage";
import { ResetPasswordPage } from "../pages/reset-password/ResetPasswordPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <WelcomePage />,
    },
    {
      path: "/login",
      element: <LoginPage />,
    },
    {
      path: "/register",
      element: <RegisterPage />,
    },
    {
      path: "/reset-password",
      element: <ResetPasswordPage />,
    },
  ],
  {
    basename: "/auth",
  },
);
