import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
    } catch {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        database: 'down',
      });
    }

    return { status: 'ok', database: 'up' };
  }

  private async withTimeout<T>(work: PromiseLike<T>, ms = 2000) {
    let timer: ReturnType<typeof setTimeout>;

    const expires = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('health check timed out')), ms);
    });

    try {
      return await Promise.race([work, expires]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
