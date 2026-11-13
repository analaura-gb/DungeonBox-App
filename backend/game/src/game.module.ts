import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from './prisma/prisma.module';
import { RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { StoreClient } from './store/store.client';
import { RankingClient } from './ranking/ranking.client';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [GameController],
  providers: [
    GameService,
    JwtAuthGuard,
    RunsRepository,
    CatalogRepository,
    StoreClient,
    RankingClient,
  ],
})
export class GameModule {}
