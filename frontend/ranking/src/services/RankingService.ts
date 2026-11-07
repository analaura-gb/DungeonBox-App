import { apiFetch } from "./Api";

// one run of the ranking (a player can appear more than once)
export type RankingEntry = {
  position: number;
  runId: string;
  userId: string;
  isMe: boolean;
  characterId: string;
  score: number;
  survivedTime: number; // seconds
};

export type MyStats = {
  position: number | null; // null before the first run
  totalRuns: number;
  totalWins: number;
  bestScore: number;
  bestSurvivedTime: number;
  totalEnemiesKilled: number;
  totalSurvivedTime: number;
  totalCoinsCollected: number;
  favoriteCharacter: { id: string; runs: number } | null; // most played
};

export const rankingService = {
  getRanking() {
    return apiFetch<RankingEntry[]>("/ranking");
  },

  getMyStats() {
    return apiFetch<MyStats>("/ranking/me");
  },
};
