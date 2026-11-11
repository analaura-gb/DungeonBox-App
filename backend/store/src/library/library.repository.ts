import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

type Db = Prisma.TransactionClient;

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPowerUpsByUser(userId: string) {
    return this.prisma.userPowerUp.findMany({
      where: { userId, powerUp: { deletedAt: null } },
      include: { powerUp: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findCharactersByUser(userId: string) {
    return this.prisma.userCharacter.findMany({
      where: { userId, character: { deletedAt: null } },
      include: { character: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findPowerUpOwnership(userId: string, powerUpId: string) {
    return this.prisma.userPowerUp.findUnique({
      where: { userId_powerUpId: { userId, powerUpId } },
    });
  }

  findCharacterOwnership(userId: string, characterId: string) {
    return this.prisma.userCharacter.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
  }

  grantPowerUp(userId: string, powerUpId: string, db: Db = this.prisma) {
    return db.userPowerUp.create({ data: { userId, powerUpId } });
  }

  grantCharacter(userId: string, characterId: string, db: Db = this.prisma) {
    return db.userCharacter.create({ data: { userId, characterId } });
  }
}
