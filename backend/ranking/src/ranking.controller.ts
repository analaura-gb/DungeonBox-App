import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RecordRunDto } from './dto/record-run.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { InternalKeyGuard } from './guards/internal-key.guard';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('runs')
  @UseGuards(InternalKeyGuard)
  recordRun(@Body() body: RecordRunDto) {
    return this.rankingService.recordRun(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getRanking(@Req() request: AuthenticatedRequest) {
    return this.rankingService.getRanking(request.user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyStats(@Req() request: AuthenticatedRequest) {
    return this.rankingService.getMyStats(request.user.sub);
  }
}
