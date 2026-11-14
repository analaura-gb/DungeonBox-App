import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

type RankingEntry = {
  position: number;
  userId: string;
  isMe: boolean;
  characterId: string;
  score: number;
};

type MyStats = {
  position: number | null;
  totalRuns: number;
  totalWins: number;
  bestScore: number;
  favoriteCharacter: { id: string; runs: number } | null;
};

describe('RankingController E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;

  const httpServer = () => app.getHttpServer() as App;

  const serviceCookies = new Map<string, string>();

  const signCookie = async (payload: object) => {
    const token = await new JwtService({
      secret: process.env.JWT_SECRET,
    }).signAsync(payload);

    return `access_token=${token}`;
  };

  const run = (score: number, won = false, characterId = 'ana-laura') => ({
    runId: randomUUID(),
    characterId,
    won,
    score,
    enemiesKilled: 50,
    survivedTime: won ? 600 : 120,
    coinsCollected: Math.floor(score / 100),
  });

  const recordRun = (userId: string, body: object, as?: string) =>
    request(httpServer())
      .post('/api/ranking/me/runs')
      .set('Cookie', as ?? serviceCookies.get(userId) ?? '')
      .send(body);

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    configureApp(app);

    await app.init();

    cookie = await signCookie({ sub: 'user-1', email: 'user-1@email.com' });

    for (const userId of ['user-1', 'user-2', 'user-3']) {
      serviceCookies.set(
        userId,
        await signCookie({ sub: userId, svc: 'game' }),
      );
    }
  });

  beforeEach(async () => {
    await prisma.runStats.deleteMany();
    await prisma.generalStats.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should only accept runs from a service token', async () => {
    await recordRun('user-1', run(100), cookie).expect(403);
    await recordRun('user-1', run(100)).expect(201);
  });

  it('should record the run under the owner of the token', async () => {
    await recordRun('user-2', run(100)).expect(201);

    const saved = await prisma.runStats.findFirstOrThrow();

    expect(saved.userId).toBe('user-2');
  });

  it('should refuse a body that tries to pick the owner', async () => {
    await recordRun('user-1', { ...run(100), userId: 'user-2' }).expect(400);
  });

  it('should not record the same run twice', async () => {
    const body = run(100);

    await recordRun('user-1', body).expect(201);
    await recordRun('user-1', body).expect(409);
  });

  it('should validate the run body', async () => {
    await recordRun('user-1', { ...run(100), score: -1 }).expect(400);
    await recordRun('user-1', { ...run(100), runId: 'abc' }).expect(400);
  });

  it('should keep the build of each run to show it in the ranking', async () => {
    await recordRun('user-1', {
      ...run(900),
      weapons: [
        { id: 'compiler', level: 8 },
        { id: 'duck', level: 3 },
      ],
      passiveItems: [{ id: 'espresso', level: 2 }],
    }).expect(201);
    await recordRun('user-2', run(500)).expect(201);

    const response = await request(httpServer())
      .get('/api/ranking')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as (RankingEntry & {
      weapons: { id: string; level: number }[];
      passiveItems: { id: string; level: number }[];
    })[];

    expect(body[0].weapons).toEqual([
      { id: 'compiler', level: 8 },
      { id: 'duck', level: 3 },
    ]);
    expect(body[0].passiveItems).toEqual([{ id: 'espresso', level: 2 }]);
    expect(body[1].weapons).toEqual([]);
    expect(body[1].passiveItems).toEqual([]);
  });

  it('should refuse a build item without a valid level', async () => {
    await recordRun('user-1', {
      ...run(100),
      weapons: [{ id: 'compiler', level: 0 }],
    }).expect(400);
  });

  it('should need a session on every route', async () => {
    await request(httpServer()).get('/api/ranking').expect(401);
    await request(httpServer()).get('/api/ranking/me').expect(401);
    await request(httpServer()).post('/api/ranking/me/runs').expect(401);
  });

  it('should rank the best runs, even several of the same player', async () => {
    await recordRun('user-1', run(900, false, 'enzo')).expect(201);
    await recordRun('user-1', run(300)).expect(201);
    await recordRun('user-2', run(2000)).expect(201);
    await recordRun('user-3', run(500)).expect(201);

    const response = await request(httpServer())
      .get('/api/ranking')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as RankingEntry[];

    expect(body.map((r) => [r.position, r.userId, r.score])).toEqual([
      [1, 'user-2', 2000],
      [2, 'user-1', 900],
      [3, 'user-3', 500],
      [4, 'user-1', 300],
    ]);
    expect(body[1].isMe).toBe(true);
    expect(body[1].characterId).toBe('enzo');
  });

  it("should return the player's totals and position", async () => {
    await recordRun('user-1', run(900, true)).expect(201);
    await recordRun('user-1', run(300, false, 'bruno')).expect(201);
    await recordRun('user-1', run(400, false, 'bruno')).expect(201);
    await recordRun('user-2', run(2000)).expect(201);

    const response = await request(httpServer())
      .get('/api/ranking/me')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as MyStats;

    expect(body.position).toBe(2);
    expect(body.totalRuns).toBe(3);
    expect(body.totalWins).toBe(1);
    expect(body.bestScore).toBe(900);
    expect(body.favoriteCharacter).toEqual({ id: 'bruno', runs: 2 });
  });
});
