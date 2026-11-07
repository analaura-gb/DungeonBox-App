import { Injectable } from '@nestjs/common';
import { RunStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type RunItemData = {
  id: string;
  level: number;
};

export type FinishRunData = {
  status: RunStatus;
  score: number;
  kills: number;
  levelReached: number;
  survivedTime: number;
  coinsEarned: number;
  weapons: RunItemData[];
  passiveItems: RunItemData[];
};

@Injectable()
export class RunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCharacter(id: string) {
    return this.prisma.character.findUnique({
      where: { id },
    });
  }

  findWeapons() {
    return this.prisma.weapon.findMany();
  }

  findPassiveItems() {
    return this.prisma.passiveItem.findMany();
  }

  create(userId: string, characterId: string) {
    return this.prisma.run.create({
      data: { userId, characterId },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.run.findFirst({
      where: { id, userId },
      include: { character: true },
    });
  }

  finish(id: string, data: FinishRunData) {
    const { weapons, passiveItems, ...result } = data;

    return this.prisma.run.update({
      where: { id },
      data: {
        ...result,
        finishedAt: new Date(),
        weapons: {
          create: weapons.map((w) => ({ weaponId: w.id, level: w.level })),
        },
        passiveItems: {
          create: passiveItems.map((p) => ({
            passiveItemId: p.id,
            level: p.level,
          })),
        },
      },
      include: { weapons: true, passiveItems: true },
    });
  }

  // finished runs of one player, best score first
  findBestFinished(userId: string, limit: number) {
    return this.prisma.run.findMany({
      where: { userId, status: { not: RunStatus.IN_PROGRESS } },
      orderBy: [{ score: 'desc' }, { finishedAt: 'asc' }],
      take: limit,
    });
  }
}
