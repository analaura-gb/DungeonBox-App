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

  // the auth service creates this cookie at login; here it is signed directly
  const sessionCookie = async (userId: string) => {
    const token = await new JwtService({
      secret: process.env.JWT_SECRET,
    }).signAsync({ sub: userId, email: `${userId}@email.com` });

    return `access_token=${token}`;
  };

  // what the game service sends when a run ends
  const run = (
    userId: string,
    score: number,
    won = false,
    characterId = 'ana-laura',
  ) => ({
    runId: randomUUID(),
    userId,
    characterId,
    won,
    score,
    enemiesKilled: 50,
    survivedTime: won ? 600 : 120,
    coinsCollected: Math.floor(score / 100),
  });

  const recordRun = (body: object, key = process.env.INTERNAL_API_KEY) =>
    request(httpServer())
      .post('/api/ranking/runs')
      .set('x-internal-key', key ?? '')
      .send(body);

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    process.env.INTERNAL_API_KEY =
      process.env.INTERNAL_API_KEY || 'test-internal-key';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    configureApp(app);

    await app.init();

    cookie = await sessionCookie('user-1');
  });

  beforeEach(async () => {
    await prisma.runStats.deleteMany();
    await prisma.generalStats.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should only accept runs with the internal key', async () => {
    await recordRun(run('user-1', 100), 'wrong-key').expect(401);
    await recordRun(run('user-1', 100)).expect(201);
  });

  it('should not record the same run twice', async () => {
    const body = run('user-1', 100);

    await recordRun(body).expect(201);
    await recordRun(body).expect(409);
  });

  it('should validate the run body', async () => {
    await recordRun({ ...run('user-1', 100), score: -1 }).expect(400);
    await recordRun({ ...run('user-1', 100), runId: 'abc' }).expect(400);
  });

  it('should need a session to read the ranking', async () => {
    await request(httpServer()).get('/api/ranking').expect(401);
    await request(httpServer()).get('/api/ranking/me').expect(401);
  });

  it('should rank the best runs, even several of the same player', async () => {
    await recordRun(run('user-1', 900, false, 'enzo')).expect(201);
    await recordRun(run('user-1', 300)).expect(201);
    await recordRun(run('user-2', 2000)).expect(201);
    await recordRun(run('user-3', 500)).expect(201);

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
    await recordRun(run('user-1', 900, true)).expect(201);
    await recordRun(run('user-1', 300, false, 'bruno')).expect(201);
    await recordRun(run('user-1', 400, false, 'bruno')).expect(201);
    await recordRun(run('user-2', 2000)).expect(201);

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
