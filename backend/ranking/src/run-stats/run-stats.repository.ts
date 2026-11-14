import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type BuildItem = { id: string; level: number };

export type CreateRunStatsData = {
  runId: string;
  userId: string;
  characterId: string;
  won: boolean;
  score: number;
  enemiesKilled: number;
  survivedTime: number;
  coinsCollected: number;
  weapons?: BuildItem[];
  passiveItems?: BuildItem[];
};

@Injectable()
export class RunStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByRunId(runId: string) {
    return this.prisma.runStats.findUnique({
      where: { runId },
    });
  }

  create(data: CreateRunStatsData) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const current = await tx.generalStats.findUnique({
        where: { userId: data.userId },
      });

      if (!current) {
        await tx.generalStats.create({
          data: {
            userId: data.userId,
            totalRuns: 1,
            totalWins: data.won ? 1 : 0,
            totalScore: data.score,
            bestScore: data.score,
            totalEnemiesKilled: data.enemiesKilled,
            totalSurvivedTime: data.survivedTime,
            bestSurvivedTime: data.survivedTime,
            totalCoinsCollected: data.coinsCollected,
            lastRunAt: now,
          },
        });
      } else {
        await tx.generalStats.update({
          where: { userId: data.userId },
          data: {
            totalRuns: { increment: 1 },
            totalWins: { increment: data.won ? 1 : 0 },
            totalScore: { increment: data.score },
            bestScore: Math.max(current.bestScore, data.score),
            totalEnemiesKilled: { increment: data.enemiesKilled },
            totalSurvivedTime: { increment: data.survivedTime },
            bestSurvivedTime: Math.max(
              current.bestSurvivedTime,
              data.survivedTime,
            ),
            totalCoinsCollected: { increment: data.coinsCollected },
            lastRunAt: now,
          },
        });
      }

      return tx.runStats.create({ data: { ...data, createdAt: now } });
    });
  }

  findTopRuns(limit: number) {
    return this.prisma.runStats.findMany({
      orderBy: [
        { score: 'desc' },
        { survivedTime: 'desc' },
        { createdAt: 'asc' },
      ],
      take: limit,
    });
  }

  findPlayerStats(userId: string) {
    return this.prisma.generalStats.findUnique({
      where: { userId },
    });
  }

  countRunsAbove(score: number) {
    return this.prisma.runStats.count({
      where: { score: { gt: score } },
    });
  }

  findTopCharacters(userId: string, limit: number) {
    return this.prisma.runStats.groupBy({
      by: ['characterId'],
      where: { userId },
      _count: { _all: true },
      orderBy: { _count: { characterId: 'desc' } },
      take: limit,
    });
  }
}
