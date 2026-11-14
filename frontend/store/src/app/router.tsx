import { createBrowserRouter } from "react-router";
import { StorePage } from "../pages/store/StorePage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <StorePage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ""),
  },
);
