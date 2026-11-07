import { createBrowserRouter } from "react-router";
import { GamePage } from "../pages/game/GamePage";

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <GamePage />,
    },
  ],
  {
    basename: "/game",
  },
);
