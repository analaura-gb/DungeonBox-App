import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RecordRunDto } from './dto/record-run.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard';
import { ServiceOnly } from './guards/service-only.decorator';

@Controller('ranking')
@UseGuards(JwtAuthGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('me/runs')
  @ServiceOnly()
  recordRun(@Req() request: AuthenticatedRequest, @Body() body: RecordRunDto) {
    return this.rankingService.recordRun(request.user.sub, body);
  }

  @Get()
  getRanking(@Req() request: AuthenticatedRequest) {
    return this.rankingService.getRanking(request.user.sub);
  }

  @Get('me')
  getMyStats(@Req() request: AuthenticatedRequest) {
    return this.rankingService.getMyStats(request.user.sub);
  }
}
