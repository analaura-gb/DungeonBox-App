import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { PrismaModule } from './prisma/prisma.module';
import { RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [GameController],
  providers: [GameService, JwtAuthGuard, RunsRepository, CatalogRepository],
})
export class GameModule {}
