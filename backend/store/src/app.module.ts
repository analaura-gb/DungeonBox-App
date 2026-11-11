import { Module } from '@nestjs/common';
import { StoreModule } from './store.module';

@Module({
  imports: [StoreModule],
})
export class AppModule {}
