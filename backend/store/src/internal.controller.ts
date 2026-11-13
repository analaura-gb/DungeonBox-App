import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { InternalKeyGuard } from './guards/internal-key.guard';
import { CreditCoinsDto } from './dto/credit-coins.dto';

@Controller('store/internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(private readonly storeService: StoreService) {}

  @Post('wallets/:userId/credit')
  @HttpCode(HttpStatus.OK)
  creditCoins(@Param('userId') userId: string, @Body() body: CreditCoinsDto) {
    return this.storeService.creditCoins(userId, body.amount);
  }
}
