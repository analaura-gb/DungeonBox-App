import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

type Db = Prisma.TransactionClient;

@Injectable()
export class WalletsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.wallet.findUnique({
      where: { userId },
    });
  }

  ensureForUser(userId: string) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  credit(userId: string, amount: number) {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: { coins: { increment: amount } },
      create: { userId, coins: amount },
      select: { coins: true },
    });
  }

  debit(userId: string, amount: number, db: Db = this.prisma) {
    return db.wallet.update({
      where: { userId },
      data: { coins: { decrement: amount } },
      select: { coins: true },
    });
  }
}
