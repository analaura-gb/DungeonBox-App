import { apiFetch } from "./Api";

export type StoreCharacter = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export const storeService = {
  getCharacters() {
    return apiFetch<StoreCharacter[]>("/store/characters");
  },
};
