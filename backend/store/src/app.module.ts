import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { StoreModule } from './store.module';

@Module({
  imports: [StoreModule, HealthModule],
})
export class AppModule {}
