import { ConflictException, Injectable } from '@nestjs/common';
import { RecordRunDto } from './dto/record-run.dto';
import {
  BuildItem,
  RunStatsRepository,
} from './run-stats/run-stats.repository';

const RANKING_LIMIT = 10;

@Injectable()
export class RankingService {
  constructor(private readonly runStatsRepository: RunStatsRepository) {}

  async recordRun(userId: string, data: RecordRunDto) {
    const alreadyRecorded = await this.runStatsRepository.findByRunId(
      data.runId,
    );

    if (alreadyRecorded) {
      throw new ConflictException('Run already recorded');
    }

    await this.runStatsRepository.create({ ...data, userId });

    return { message: 'Run recorded' };
  }

  async getRanking(userId: string) {
    const runs = await this.runStatsRepository.findTopRuns(RANKING_LIMIT);

    return runs.map((run, index) => ({
      position: index + 1,
      runId: run.runId,
      userId: run.userId,
      isMe: run.userId === userId,
      characterId: run.characterId,
      score: run.score,
      survivedTime: run.survivedTime,
      weapons: run.weapons as BuildItem[],
      passiveItems: run.passiveItems as BuildItem[],
    }));
  }

  async getMyStats(userId: string) {
    const [stats, topCharacters] = await Promise.all([
      this.runStatsRepository.findPlayerStats(userId),
      this.runStatsRepository.findTopCharacters(userId, 1),
    ]);

    const [favorite] = topCharacters;

    if (!stats) {
      return {
        position: null,
        totalRuns: 0,
        totalWins: 0,
        bestScore: 0,
        bestSurvivedTime: 0,
        totalEnemiesKilled: 0,
        totalSurvivedTime: 0,
        totalCoinsCollected: 0,
        favoriteCharacter: null,
      };
    }

    const runsAbove = await this.runStatsRepository.countRunsAbove(
      stats.bestScore,
    );

    return {
      position: runsAbove + 1,
      totalRuns: stats.totalRuns,
      totalWins: stats.totalWins,
      bestScore: stats.bestScore,
      bestSurvivedTime: stats.bestSurvivedTime,
      totalEnemiesKilled: stats.totalEnemiesKilled,
      totalSurvivedTime: stats.totalSurvivedTime,
      totalCoinsCollected: stats.totalCoinsCollected,
      favoriteCharacter: favorite
        ? { id: favorite.characterId, runs: favorite._count._all }
        : null,
    };
  }
}
