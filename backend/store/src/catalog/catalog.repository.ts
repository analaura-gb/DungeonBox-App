import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPowerUps() {
    return this.prisma.powerUp.findMany({
      where: { deletedAt: null },
      orderBy: { price: 'asc' },
    });
  }

  findPowerUpById(id: string) {
    return this.prisma.powerUp.findFirst({
      where: { id, deletedAt: null },
    });
  }

  findCharacters() {
    return this.prisma.character.findMany({
      where: { deletedAt: null },
      orderBy: { price: 'asc' },
    });
  }

  findCharacterById(id: string) {
    return this.prisma.character.findFirst({
      where: { id, deletedAt: null },
    });
  }
}
