import { apiFetch } from "./Api";

export type PowerUp = {
  id: string;
  name: string;
  price: number;
  attack: number;
  defense: number;
  health: number;
  movementSpeed: number;
  attackSpeed: number;
  projectileSpeed: number;
  projectileSize: number;
  imageUrl: string | null;
};

export type Character = {
  id: string;
  name: string;
  price: number;
  initialWeaponId: string;
  imageUrl: string | null;
};

type WalletResponse = {
  coins: number;
};

type PurchaseResponse = {
  message: string;
  remainingCoins: number;
};

export const storeService = {
  listPowerUps() {
    return apiFetch<PowerUp[]>("/store/power-ups", { method: "GET" });
  },

  listCharacters() {
    return apiFetch<Character[]>("/store/characters", { method: "GET" });
  },

  wallet() {
    return apiFetch<WalletResponse>("/store/me/wallet", { method: "GET" });
  },

  ownedPowerUps() {
    return apiFetch<PowerUp[]>("/store/me/power-ups", { method: "GET" });
  },

  ownedCharacters() {
    return apiFetch<Character[]>("/store/me/characters", { method: "GET" });
  },

  purchasePowerUp(id: string) {
    return apiFetch<PurchaseResponse>(`/store/power-ups/${id}/purchase`, {
      method: "POST",
    });
  },

  purchaseCharacter(id: string) {
    return apiFetch<PurchaseResponse>(`/store/characters/${id}/purchase`, {
      method: "POST",
    });
  },
};
