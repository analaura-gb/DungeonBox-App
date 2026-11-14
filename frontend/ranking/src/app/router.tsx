import { createBrowserRouter } from "react-router";
import { RankingPage } from "../pages/ranking/RankingPage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <RankingPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, ""),
  },
);
