import { Injectable } from '@nestjs/common';

export type RankingBuildItem = {
  id: string;
  level: number;
};

export type RankingRun = {
  runId: string;
  userId: string;
  characterId: string;
  won: boolean;
  score: number;
  enemiesKilled: number;
  survivedTime: number;
  coinsCollected: number;
  weapons: RankingBuildItem[];
  passiveItems: RankingBuildItem[];
};

@Injectable()
export class RankingClient {
  private static readonly TIMEOUT_MS = 2000;

  isConfigured() {
    return Boolean(process.env.RANKING_API_URL);
  }

  async recordRun(run: RankingRun) {
    const response = await fetch(
      `${process.env.RANKING_API_URL}/api/ranking/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify(run),
        signal: AbortSignal.timeout(RankingClient.TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Ranking answered ${response.status} when recording the run`,
      );
    }
  }
}
