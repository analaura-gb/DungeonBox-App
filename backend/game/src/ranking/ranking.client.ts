import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type RankingBuildItem = {
  id: string;
  level: number;
};

export type RankingRun = {
  runId: string;
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

  constructor(private readonly jwtService: JwtService) {}

  isConfigured() {
    return Boolean(process.env.RANKING_API_URL);
  }

  async recordRun(userId: string, run: RankingRun) {
    const token = await this.jwtService.signAsync({
      sub: userId,
      svc: 'game',
    });

    const response = await fetch(
      `${process.env.RANKING_API_URL}/api/ranking/me/runs`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `access_token=${token}`,
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
