import { apiFetch } from "./Api";
import type { CharacterDef, PowerUpDef } from "../game/content";

export const storeService = {
  getCharacters() {
    return apiFetch<CharacterDef[]>("/store/characters");
  },

  getOwnedCharacters() {
    return apiFetch<CharacterDef[]>("/store/me/characters");
  },

  getOwnedPowerUps() {
    return apiFetch<PowerUpDef[]>("/store/me/power-ups");
  },
};
