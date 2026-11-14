import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { RankingModule } from './ranking.module';

@Module({
  imports: [RankingModule, HealthModule],
})
export class AppModule {}
