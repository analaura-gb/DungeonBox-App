import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEnemies() {
    return this.prisma.enemy.findMany({
      where: { bossOrder: null },
      orderBy: [{ minTime: 'asc' }, { id: 'asc' }],
    });
  }

  findBosses() {
    return this.prisma.enemy.findMany({
      where: { bossOrder: { not: null } },
      orderBy: { bossOrder: 'asc' },
    });
  }

  findPickups() {
    return this.prisma.pickup.findMany();
  }

  findWeapons() {
    return this.prisma.weapon.findMany({
      include: {
        levels: {
          omit: { id: true, weaponId: true },
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  findPassiveItems() {
    return this.prisma.passiveItem.findMany({ orderBy: { id: 'asc' } });
  }
}
