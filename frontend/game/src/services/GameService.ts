import { apiFetch } from "./Api";
import type { GameCatalog } from "../game/content";

export type RunItem = {
  id: string;
  level: number;
};

export type StartedRun = {
  id: string;
  characterId: string;
  startedAt: string;
};

export type FinishRunRequest = {
  won: boolean;
  score: number;
  kills: number;
  levelReached: number;
  survivedTime: number;
  weapons: RunItem[];
  passiveItems: RunItem[];
};

export type RunSummary = {
  id: string;
  characterId: string;
  status: "IN_PROGRESS" | "WON" | "DIED";
  score: number;
  kills: number;
  levelReached: number;
  survivedTime: number;
  coinsEarned: number;
  startedAt: string;
  finishedAt: string | null;
};

export const gameService = {
  getCatalog() {
    return apiFetch<GameCatalog>("/game/catalog");
  },

  startRun(characterId: string) {
    return apiFetch<StartedRun>("/game/runs", {
      method: "POST",
      body: JSON.stringify({ characterId }),
    });
  },

  finishRun(runId: string, data: FinishRunRequest) {
    return apiFetch<RunSummary>(`/game/runs/${runId}/finish`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  myBestRuns() {
    return apiFetch<RunSummary[]>("/game/runs/me");
  },
};
