import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { PrismaModule } from './prisma/prisma.module';
import { CatalogRepository } from './catalog/catalog.repository';
import { LibraryRepository } from './library/library.repository';
import { WalletsRepository } from './wallets/wallets.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  controllers: [StoreController],
  providers: [
    StoreService,
    JwtAuthGuard,
    CatalogRepository,
    LibraryRepository,
    WalletsRepository,
  ],
})
export class StoreModule {}
