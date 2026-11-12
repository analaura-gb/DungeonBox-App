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

  it('should return the enemies, bosses, pickups, weapons and passive items of the game', async () => {
    const response = await request(httpServer())
      .get('/api/game/catalog')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as {
      enemies: {
        id: string;
        boss: boolean;
        minTime: number;
        imageUrl: string | null;
      }[];
      bosses: { id: string; boss: boolean; imageUrl: string | null }[];
      pickups: { id: string; dropChance: number; imageUrl: string | null }[];
      weapons: {
        id: string;
        behavior: string;
        imageUrl: string | null;
        shotImageUrl: string | null;
        levels: { level: number; damage: number }[];
      }[];
      passiveItems: { id: string; stat: string; maxLevel: number }[];
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
    expect(body.weapons.map((w) => [w.id, w.behavior])).toEqual([
      ['compiler', 'projectile'],
      ['drone', 'drone'],
      ['duck', 'orbit'],
      ['gc', 'aura'],
      ['solder', 'melee'],
      ['wifi', 'pulse'],
    ]);
    expect(
      body.weapons.every(
        (w) =>
          w.levels.length === 8 &&
          w.levels.every((l, i) => l.level === i + 1 && !('id' in l)),
      ),
    ).toBe(true);
    expect(body.enemies[0].imageUrl).toBe('/assets/enemies/bug.png');
    expect(body.bosses[0].imageUrl).toBe('/assets/bosses/calc1.png');
    expect(body.pickups.find((p) => p.id === 'xp')?.imageUrl).toBeNull();
    expect(body.weapons.find((w) => w.id === 'drone')).toMatchObject({
      imageUrl: '/assets/weapons/drone.png',
      shotImageUrl: '/assets/weapons/drone-shot.png',
    });

    expect(body.passiveItems.map((p) => p.stat).sort()).toEqual([
      'armor',
      'cooldown',
      'damage',
      'maxHp',
      'pickupRadius',
      'speed',
      'xp',
    ]);
  });

  it('should start a run', async () => {
    const run = await startRun();

    expect(run.id).toBeString();
    expect(run.characterId).toBe('ana-laura');
  });

  it('should only start a run with a character the store says the user owns', async () => {
    const seen: string[] = [];
    const store = Bun.serve({
      port: 0,
      fetch(req) {
        seen.push(req.headers.get('cookie') ?? '');

        return Response.json([{ id: 'guilherme', initialWeaponId: 'duck' }]);
      },
    });
    process.env.STORE_API_URL = `http://localhost:${store.port}`;

    try {
      await request(httpServer())
        .post('/api/game/runs')
        .set('Cookie', cookie)
        .send({ characterId: 'ana-laura' })
        .expect(403);

      const response = await request(httpServer())
        .post('/api/game/runs')
        .set('Cookie', cookie)
        .send({ characterId: 'guilherme' })
        .expect(201);

      const run = await prisma.run.findUniqueOrThrow({
        where: { id: (response.body as RunBody).id },
      });

      expect(run.startWeaponId).toBe('duck');
      expect(seen.every((c) => c.startsWith('access_token='))).toBe(true);
    } finally {
      delete process.env.STORE_API_URL;
      await store.stop(true);
    }
  });

  it('should not start a run when the store is down', async () => {
    process.env.STORE_API_URL = 'http://localhost:1';

    try {
      await request(httpServer())
        .post('/api/game/runs')
        .set('Cookie', cookie)
        .send({ characterId: 'ana-laura' })
        .expect(503);
    } finally {
      delete process.env.STORE_API_URL;
    }
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

  it("should add the coins of a finished run to the player's store wallet", async () => {
    const credits: { path: string; key: string | null; body: unknown }[] = [];
    const store = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;

        if (path.endsWith('/credit')) {
          credits.push({
            path,
            key: req.headers.get('x-internal-key'),
            body: await req.json(),
          });

          return Response.json({ coins: 25 });
        }

        return Response.json([
          { id: 'ana-laura', initialWeaponId: 'compiler' },
        ]);
      },
    });
    process.env.STORE_API_URL = `http://localhost:${store.port}`;
    process.env.INTERNAL_API_KEY = 'e2e-internal-key';

    try {
      const run = await startRun();

      await request(httpServer())
        .post(`/api/game/runs/${run.id}/finish`)
        .set('Cookie', cookie)
        .send(result)
        .expect(200);

      for (let i = 0; i < 50 && credits.length === 0; i++) {
        await Bun.sleep(20);
      }

      expect(credits).toEqual([
        {
          path: '/api/store/internal/wallets/user-1/credit',
          key: 'e2e-internal-key',
          body: { amount: 25 },
        },
      ]);
    } finally {
      delete process.env.STORE_API_URL;
      delete process.env.INTERNAL_API_KEY;
      await store.stop(true);
    }
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
