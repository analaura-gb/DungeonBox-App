import { apiFetch } from "./Api";

export type BuildPiece = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type GameCatalog = {
  weapons: BuildPiece[];
  passiveItems: BuildPiece[];
};

export const gameService = {
  getCatalog() {
    return apiFetch<GameCatalog>("/game/catalog");
  },
};
