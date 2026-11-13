import { Module } from '@nestjs/common';
import { RankingModule } from './ranking.module';

@Module({
  imports: [RankingModule],
})
export class AppModule {}
