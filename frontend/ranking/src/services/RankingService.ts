import { apiFetch } from "./Api";

export type BuildItem = {
  id: string;
  level: number;
};

export type RankingEntry = {
  position: number;
  runId: string;
  userId: string;
  isMe: boolean;
  characterId: string;
  score: number;
  survivedTime: number;
  weapons: BuildItem[];
  passiveItems: BuildItem[];
};

export type MyStats = {
  position: number | null;
  totalRuns: number;
  totalWins: number;
  bestScore: number;
  bestSurvivedTime: number;
  totalEnemiesKilled: number;
  totalSurvivedTime: number;
  totalCoinsCollected: number;
  favoriteCharacter: { id: string; runs: number } | null;
};

export const rankingService = {
  getRanking() {
    return apiFetch<RankingEntry[]>("/ranking");
  },

  getMyStats() {
    return apiFetch<MyStats>("/ranking/me");
  },
};
