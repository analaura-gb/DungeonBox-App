import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GameService } from './game.service';
import { StartRunDto } from './dto/start-run.dto';
import { FinishRunDto } from './dto/finish-run.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';

// every route needs the session cookie created by the auth service
@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // called when the player presses START
  @Post('runs')
  startRun(@Req() request: AuthenticatedRequest, @Body() body: StartRunDto) {
    return this.gameService.startRun(request.user.sub, body);
  }

  // called on game over / graduation with the final result
  @Post('runs/:id/finish')
  @HttpCode(200)
  finishRun(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FinishRunDto,
  ) {
    return this.gameService.finishRun(request.user.sub, id, body);
  }

  // the player's best finished runs (high scores)
  @Get('runs/me')
  listMyRuns(@Req() request: AuthenticatedRequest) {
    return this.gameService.listBest(request.user.sub);
  }
}
