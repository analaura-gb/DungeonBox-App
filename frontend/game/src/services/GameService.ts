import { apiFetch } from "./Api";

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
  survivedTime: number; // seconds
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

  // the player's 10 best finished runs
  myBestRuns() {
    return apiFetch<RunSummary[]>("/game/runs/me");
  },
};
