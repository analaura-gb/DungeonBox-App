import { describe, expect, it, mock } from 'bun:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  function build(queryRaw: () => Promise<unknown>) {
    const queryRawMock = mock(queryRaw);
    const prisma = { $queryRaw: queryRawMock } as unknown as PrismaService;

    return { queryRawMock, controller: new HealthController(prisma) };
  }

  it('responde live sem consultar o banco', () => {
    const { queryRawMock, controller } = build(() => Promise.resolve([]));

    expect(controller.live()).toEqual({ status: 'ok' });
    expect(queryRawMock).not.toHaveBeenCalled();
  });

  it('responde ready quando o banco responde', async () => {
    const { controller } = build(() => Promise.resolve([{ ok: 1 }]));

    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('devolve 503 quando o banco nao responde', async () => {
    const { controller } = build(() =>
      Promise.reject(new Error('connection refused')),
    );

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('devolve 503 quando o banco pendura em vez de recusar', async () => {
    const { controller } = build(() => new Promise(() => {}));

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  }, 10_000);
});
