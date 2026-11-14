import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { GameModule } from './game.module';

@Module({
  imports: [GameModule, HealthModule],
})
export class AppModule {}
