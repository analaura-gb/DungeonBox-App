import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { PrismaModule } from './prisma/prisma.module';
import { RunStatsRepository } from './run-stats/run-stats.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InternalKeyGuard } from './guards/internal-key.guard';

@Module({
  imports: [
    PrismaModule,
    // tokens are created by the auth service; here they are only verified
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [RankingController],
  providers: [
    RankingService,
    JwtAuthGuard,
    InternalKeyGuard,
    RunStatsRepository,
  ],
})
export class RankingModule {}
