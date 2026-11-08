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
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

type RunBody = {
  id: string;
  characterId: string;
  status: string;
  score: number;
  coinsEarned: number;
  weapons?: { id: string; level: number }[];
};

describe('GameController E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookie: string;
  let otherCookie: string;

  const httpServer = () => app.getHttpServer() as App;

  const result = {
    won: false,
    score: 2500,
    kills: 120,
    levelReached: 10,
    survivedTime: 0,
    weapons: [
      { id: 'compiler', level: 4 },
      { id: 'gc', level: 2 },
    ],
    passiveItems: [{ id: 'espresso', level: 3 }],
  };

  const sessionCookie = async (userId: string) => {
    const token = await new JwtService({
      secret: process.env.JWT_SECRET,
    }).signAsync({ sub: userId, email: `${userId}@email.com` });

    return `access_token=${token}`;
  };

  const startRun = async (characterId = 'ana-laura') => {
    const response = await request(httpServer())
      .post('/api/game/runs')
      .set('Cookie', cookie)
      .send({ characterId })
      .expect(201);

    return response.body as RunBody;
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    configureApp(app);

    await app.init();

    cookie = await sessionCookie('user-1');
    otherCookie = await sessionCookie('user-2');
  });

  beforeEach(async () => {
    await prisma.run.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject requests without a session', async () => {
    await request(httpServer())
      .post('/api/game/runs')
      .send({ characterId: 'ana-laura' })
      .expect(401);

    await request(httpServer()).get('/api/game/runs/me').expect(401);
    await request(httpServer()).get('/api/game/catalog').expect(401);
  });

  it('should return the enemies, bosses and pickups of the game', async () => {
    const response = await request(httpServer())
      .get('/api/game/catalog')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as {
      enemies: { id: string; boss: boolean; minTime: number }[];
      bosses: { id: string; boss: boolean }[];
      pickups: { id: string; dropChance: number }[];
    };

    expect(body.enemies.map((e) => e.id)).toEqual([
      'bug',
      'null',
      'crash',
      'merge',
      'deadline',
      'legacy',
    ]);
    expect(body.bosses.map((e) => e.id)).toEqual([
      'calc1',
      'calc2',
      'calc3',
      'thesis',
    ]);
    expect(body.bosses.every((e) => e.boss)).toBe(true);
    expect(body.pickups.map((p) => p.id).sort()).toEqual([
      'heal',
      'magnet',
      'nuke',
      'xp',
    ]);
  });

  it('should start a run', async () => {
    const run = await startRun();

    expect(run.id).toBeString();
    expect(run.characterId).toBe('ana-laura');
  });

  it('should reject an unknown character', async () => {
    await request(httpServer())
      .post('/api/game/runs')
      .set('Cookie', cookie)
      .send({ characterId: 'nobody' })
      .expect(400);
  });

  it('should finish a run and save its weapons and passive items', async () => {
    const run = await startRun();

    const response = await request(httpServer())
      .post(`/api/game/runs/${run.id}/finish`)
      .set('Cookie', cookie)
      .send(result)
      .expect(200);

    const body = response.body as RunBody;

    expect(body.status).toBe('DIED');
    expect(body.score).toBe(2500);
    expect(body.coinsEarned).toBe(25);
    expect(body.weapons).toHaveLength(2);

    const saved = await prisma.run.findUnique({
      where: { id: run.id },
      include: { weapons: true, passiveItems: true },
    });

    expect(saved?.finishedAt).not.toBeNull();
    expect(saved?.weapons).toHaveLength(2);
    expect(saved?.passiveItems).toHaveLength(1);
  });

  it('should not finish the same run twice', async () => {
    const run = await startRun();
    const finish = () =>
      request(httpServer())
        .post(`/api/game/runs/${run.id}/finish`)
        .set('Cookie', cookie)
        .send(result);

    await finish().expect(200);
    await finish().expect(409);
  });

  it("should not finish another player's run", async () => {
    const run = await startRun();

    await request(httpServer())
      .post(`/api/game/runs/${run.id}/finish`)
      .set('Cookie', otherCookie)
      .send(result)
      .expect(404);
  });

  it('should validate the result body', async () => {
    const run = await startRun();
    const finish = (body: object) =>
      request(httpServer())
        .post(`/api/game/runs/${run.id}/finish`)
        .set('Cookie', cookie)
        .send(body);

    await finish({
      ...result,
      weapons: [
        { id: 'compiler', level: 1 },
        { id: 'duck', level: 1 },
        { id: 'gc', level: 1 },
        { id: 'wifi', level: 1 },
      ],
    }).expect(400);

    await finish({ ...result, survivedTime: 601 }).expect(400);

    await finish({ ...result, survivedTime: 120 }).expect(400);

    await finish({ ...result, coins: 999999 }).expect(400);

    await finish(result).expect(200);
  });

  it("should list the player's finished runs, best score first", async () => {
    for (const score of [300, 900, 500]) {
      const run = await startRun();
      await request(httpServer())
        .post(`/api/game/runs/${run.id}/finish`)
        .set('Cookie', cookie)
        .send({ ...result, score })
        .expect(200);
    }
    await startRun();

    const response = await request(httpServer())
      .get('/api/game/runs/me')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as RunBody[];

    expect(body.map((r) => r.score)).toEqual([900, 500, 300]);

    const other = await request(httpServer())
      .get('/api/game/runs/me')
      .set('Cookie', otherCookie)
      .expect(200);

    expect(other.body).toEqual([]);
  });
});
