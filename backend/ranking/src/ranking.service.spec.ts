import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RunStatsRepository } from './run-stats/run-stats.repository';
import { RecordRunDto } from './dto/record-run.dto';

describe('RankingService', () => {
  let service: RankingService;

  const run: RecordRunDto = {
    runId: '6f1c2f43-31a4-4f6e-9a55-2f1f7c1a9b10',
    characterId: 'ana-laura',
    won: false,
    score: 1500,
    enemiesKilled: 90,
    survivedTime: 200,
    coinsCollected: 15,
  };

  const stats = (userId: string, bestScore: number) => ({
    id: `stats-${userId}`,
    userId,
    totalRuns: 3,
    totalWins: 1,
    totalScore: bestScore * 2,
    bestScore,
    totalEnemiesKilled: 300,
    totalSurvivedTime: 800,
    bestSurvivedTime: 600,
    totalCoinsCollected: 40,
    lastRunAt: new Date(),
  });

  const runStats = (userId: string, score: number) => ({
    id: `stats-${userId}-${score}`,
    runId: `run-${userId}-${score}`,
    userId,
    characterId: 'bruno',
    won: false,
    score,
    enemiesKilled: 50,
    survivedTime: 300,
    coinsCollected: Math.floor(score / 100),
    weapons: [{ id: 'wifi', level: 8 }],
    passiveItems: [],
    createdAt: new Date(),
  });

  const repositoryMock = {
    findByRunId: mock((_runId: string) => Promise.resolve(null as unknown)),
    create: mock((data: unknown) => Promise.resolve(data)),
    findTopRuns: mock((_limit: number) =>
      Promise.resolve([
        runStats('user-2', 3000),
        runStats('user-1', 1500),
        runStats('user-1', 1200),
      ]),
    ),
    findPlayerStats: mock((userId: string) =>
      Promise.resolve(stats(userId, 1500) as ReturnType<typeof stats> | null),
    ),
    countRunsAbove: mock((_score: number) => Promise.resolve(1)),
    findFavoriteCharacter: mock((_userId: string) =>
      Promise.resolve({ characterId: 'enzo', _count: { _all: 2 } } as
        | { characterId: string; _count: { _all: number } }
        | undefined),
    ),
  };

  beforeEach(async () => {
    Object.values(repositoryMock).forEach((m) => m.mockClear());
    repositoryMock.findByRunId.mockImplementation(() => Promise.resolve(null));
    repositoryMock.findPlayerStats.mockImplementation((userId: string) =>
      Promise.resolve(stats(userId, 1500)),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: RunStatsRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
  });

  describe('recordRun', () => {
    it('should save a finished run under the owner of the token', async () => {
      const result = await service.recordRun('user-1', run);

      expect(repositoryMock.create).toHaveBeenCalledWith({
        ...run,
        userId: 'user-1',
      });
      expect(result).toEqual({ message: 'Run recorded' });
    });

    it('should not save the same run twice', async () => {
      repositoryMock.findByRunId.mockImplementation(() =>
        Promise.resolve({ id: 'existing' }),
      );

      await expect(service.recordRun('user-1', run)).rejects.toThrow(
        ConflictException,
      );
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });
  });

  describe('getRanking', () => {
    it('should number the runs and mark the signed-in player', async () => {
      const result = await service.getRanking('user-1');

      expect(result.map((r) => r.position)).toEqual([1, 2, 3]);
      expect(result.map((r) => r.isMe)).toEqual([false, true, true]);
      expect(result[0].score).toBe(3000);
      expect(result[0].characterId).toBe('bruno');
      expect(result[0].weapons).toEqual([{ id: 'wifi', level: 8 }]);
      expect(result[0].passiveItems).toEqual([]);
    });
  });

  describe('getMyStats', () => {
    it('should return the totals and position of the player', async () => {
      const result = await service.getMyStats('user-1');

      expect(repositoryMock.countRunsAbove).toHaveBeenCalledWith(1500);
      expect(result.position).toBe(2);
      expect(result.totalRuns).toBe(3);
      expect(result.totalWins).toBe(1);
      expect(result.totalEnemiesKilled).toBe(300);
      expect(result.favoriteCharacter).toEqual({ id: 'enzo', runs: 2 });
    });

    it('should return zeros before the first run', async () => {
      repositoryMock.findPlayerStats.mockImplementation(() =>
        Promise.resolve(null),
      );
      repositoryMock.findFavoriteCharacter.mockImplementation(() =>
        Promise.resolve(undefined),
      );

      const result = await service.getMyStats('user-3');

      expect(result.position).toBeNull();
      expect(result.bestScore).toBe(0);
      expect(result.favoriteCharacter).toBeNull();
      expect(repositoryMock.countRunsAbove).not.toHaveBeenCalled();
    });
  });
});
