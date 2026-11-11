import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('power-ups')
  listPowerUps() {
    return this.storeService.listPowerUps();
  }

  @Get('characters')
  listCharacters() {
    return this.storeService.listCharacters();
  }

  @Get('me/wallet')
  getWallet(@Req() request: AuthenticatedRequest) {
    return this.storeService.getOrCreateWallet(request.user.sub);
  }

  @Post('me/wallet')
  @HttpCode(HttpStatus.OK)
  createWallet(@Req() request: AuthenticatedRequest) {
    return this.storeService.getOrCreateWallet(request.user.sub);
  }

  @Get('me/power-ups')
  listOwnedPowerUps(@Req() request: AuthenticatedRequest) {
    return this.storeService.listOwnedPowerUps(request.user.sub);
  }

  @Get('me/characters')
  listOwnedCharacters(@Req() request: AuthenticatedRequest) {
    return this.storeService.listOwnedCharacters(request.user.sub);
  }

  @Post('power-ups/:id/purchase')
  purchasePowerUp(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.storeService.purchasePowerUp(request.user.sub, id);
  }

  @Post('characters/:id/purchase')
  purchaseCharacter(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.storeService.purchaseCharacter(request.user.sub, id);
  }
}
