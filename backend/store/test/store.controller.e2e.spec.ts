import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';

type WalletBody = { coins: number };
type PurchaseBody = { message: string; remainingCoins: number };
type CatalogEntry = { id: string; name: string; price: number };

describe('StoreController E2E', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let cookie: string;

  const userId = 'e2e-user-1';

  const httpServer = () => app.getHttpServer() as App;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    prisma = moduleRef.get(PrismaService);

    configureApp(app);

    await app.init();

    const token = await new JwtService({
      secret: process.env.JWT_SECRET,
    }).signAsync({ sub: userId, email: 'e2e@email.com' });

    cookie = `access_token=${token}`;
  });

  beforeEach(async () => {
    await prisma.userPowerUp.deleteMany();
    await prisma.userCharacter.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.powerUp.deleteMany();
    await prisma.character.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedPowerUp(price: number) {
    return prisma.powerUp.create({
      data: {
        name: 'Iron Will',
        price,
        attack: 2,
        defense: 3,
        health: 10,
        movementSpeed: 1.1,
        attackSpeed: 1.2,
        projectileSpeed: 1,
        projectileSize: 1,
      },
    });
  }

  async function seedCharacter(id: string, price: number) {
    return prisma.character.create({
      data: {
        id,
        name: id,
        title: 'Tester',
        description: 'Seeded by the e2e suite.',
        color: '#ffffff',
        price,
        initialWeaponId: 'compiler',
        hp: 100,
        speed: 200,
        damageMul: 1,
        xpMul: 1,
        pickupRadius: 85,
      },
    });
  }

  it('should give every user the free characters and keep selling the others', async () => {
    await seedCharacter('free', 0);
    await seedCharacter('paid', 50);
    await prisma.wallet.create({ data: { userId, coins: 100 } });

    const before = await request(httpServer())
      .get('/api/store/me/characters')
      .set('Cookie', cookie)
      .expect(200);

    expect((before.body as CatalogEntry[]).map((c) => c.id)).toEqual(['free']);

    await request(httpServer())
      .post('/api/store/characters/free/purchase')
      .set('Cookie', cookie)
      .expect(409);

    await request(httpServer())
      .post('/api/store/characters/paid/purchase')
      .set('Cookie', cookie)
      .expect(201);

    const after = await request(httpServer())
      .get('/api/store/me/characters')
      .set('Cookie', cookie)
      .expect(200);

    expect((after.body as CatalogEntry[]).map((c) => c.id)).toEqual([
      'free',
      'paid',
    ]);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    expect(wallet.coins).toBe(50);
  });

  describe('credit coins', () => {
    const credit = (amount: unknown, key = process.env.INTERNAL_API_KEY) =>
      request(httpServer())
        .post(`/api/store/internal/wallets/${userId}/credit`)
        .set('x-internal-key', key ?? '')
        .send({ amount });

    it('should refuse a call without the internal key', async () => {
      await credit(10, 'wrong-key').expect(401);
    });

    it('should refuse an amount that is not a positive integer', async () => {
      await credit(0).expect(400);
      await credit(2.5).expect(400);
    });

    it('should create the wallet with the coins, then keep adding to it', async () => {
      const first = await credit(30).expect(200);

      expect(first.body).toEqual({ coins: 30 });

      const second = await credit(12).expect(200);

      expect(second.body).toEqual({ coins: 42 });
    });
  });

  it('should list the power-up catalog to a signed-in user', async () => {
    await seedPowerUp(100);

    const response = await request(httpServer())
      .get('/api/store/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    const body = response.body as CatalogEntry[];

    expect(body).toHaveLength(1);
    expect(body[0].name).toBe('Iron Will');
  });

  it('should reject every route without a session', async () => {
    const routes: ['get' | 'post', string][] = [
      ['get', '/api/store/power-ups'],
      ['get', '/api/store/characters'],
      ['get', '/api/store/me/wallet'],
      ['post', '/api/store/me/wallet'],
      ['get', '/api/store/me/power-ups'],
      ['get', '/api/store/me/characters'],
      ['post', '/api/store/power-ups/any-id/purchase'],
      ['post', '/api/store/characters/any-id/purchase'],
    ];

    const statuses: Record<string, number> = {};

    for (const [method, path] of routes) {
      const response = await request(httpServer())[method](path);

      statuses[`${method.toUpperCase()} ${path}`] = response.status;
    }

    expect(statuses).toEqual(
      Object.fromEntries(
        routes.map(([method, path]) => [
          `${method.toUpperCase()} ${path}`,
          401,
        ]),
      ),
    );
  });

  it('should expose only the catalog fields, in the shop and in the library', async () => {
    const powerUp = await seedPowerUp(10);
    await prisma.wallet.create({ data: { userId, coins: 100 } });

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(201);

    const expected = [
      'attack',
      'attackSpeed',
      'defense',
      'health',
      'id',
      'imageUrl',
      'movementSpeed',
      'name',
      'price',
      'projectileSize',
      'projectileSpeed',
      'regeneration',
      'requiredPowerUpId',
    ];

    const shop = await request(httpServer())
      .get('/api/store/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    const library = await request(httpServer())
      .get('/api/store/me/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    const shopBody = shop.body as Record<string, unknown>[];
    const libraryBody = library.body as Record<string, unknown>[];

    expect(Object.keys(shopBody[0]).sort()).toEqual(expected);
    expect(Object.keys(libraryBody[0]).sort()).toEqual(expected);
  });

  it('should only sell a power-up tier after the previous one', async () => {
    const first = await seedPowerUp(10);
    const second = await prisma.powerUp.update({
      where: { id: (await seedPowerUp(20)).id },
      data: { requiredPowerUpId: first.id },
    });
    await prisma.wallet.create({ data: { userId, coins: 100 } });

    const buy = (id: string) =>
      request(httpServer())
        .post(`/api/store/power-ups/${id}/purchase`)
        .set('Cookie', cookie);

    await buy(second.id).expect(403);
    await buy(first.id).expect(201);
    await buy(second.id).expect(201);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    expect(wallet.coins).toBe(70);
  });

  it('should not serve the catalog art itself', async () => {
    await request(httpServer()).get('/assets/catalog/coffee.png').expect(404);
  });

  it('should create the wallet on the first read when the register call never landed', async () => {
    const response = await request(httpServer())
      .get('/api/store/me/wallet')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body as WalletBody).toEqual({ coins: 0 });

    const created = await prisma.wallet.findUnique({ where: { userId } });

    expect(created?.coins).toBe(0);
  });

  it('should keep the balance across later reads', async () => {
    await prisma.wallet.create({ data: { userId, coins: 70 } });

    for (let i = 0; i < 3; i += 1) {
      const response = await request(httpServer())
        .get('/api/store/me/wallet')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body as WalletBody).toEqual({ coins: 70 });
    }

    expect(await prisma.wallet.count()).toBe(1);
  });

  it('should create the wallet of the session user', async () => {
    const response = await request(httpServer())
      .post('/api/store/me/wallet')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body as WalletBody).toEqual({ coins: 0 });

    const created = await prisma.wallet.findUnique({ where: { userId } });

    expect(created?.coins).toBe(0);
  });

  it('should answer the same way when the wallet already exists', async () => {
    await prisma.wallet.create({ data: { userId, coins: 120 } });

    const response = await request(httpServer())
      .post('/api/store/me/wallet')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body as WalletBody).toEqual({ coins: 120 });

    const wallets = await prisma.wallet.count();

    expect(wallets).toBe(1);
  });

  it('should never create a wallet for someone else', async () => {
    await request(httpServer())
      .post('/api/store/me/wallet')
      .set('Cookie', cookie)
      .send({ userId: 'someone-else' })
      .expect(200);

    const intruder = await prisma.wallet.findUnique({
      where: { userId: 'someone-else' },
    });

    expect(intruder).toBeNull();
  });

  it('should refuse a purchase the balance cannot cover', async () => {
    const powerUp = await seedPowerUp(100);
    await prisma.wallet.create({ data: { userId, coins: 50 } });

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(402);

    const owned = await prisma.userPowerUp.count({ where: { userId } });

    expect(owned).toBe(0);
  });

  it('should debit the wallet and grant the power-up', async () => {
    const powerUp = await seedPowerUp(100);
    await prisma.wallet.create({ data: { userId, coins: 150 } });

    const response = await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(201);

    expect(response.body as PurchaseBody).toEqual({
      message: 'Power-up purchased successfully',
      remainingCoins: 50,
    });

    const owned = await request(httpServer())
      .get('/api/store/me/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    expect(owned.body as CatalogEntry[]).toHaveLength(1);
  });

  it('should drop a removed power-up from the catalog, the library and the shop', async () => {
    const powerUp = await seedPowerUp(100);
    await prisma.wallet.create({ data: { userId, coins: 150 } });

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(201);

    await prisma.powerUp.update({
      where: { id: powerUp.id },
      data: { deletedAt: new Date() },
    });

    const catalog = await request(httpServer())
      .get('/api/store/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    const library = await request(httpServer())
      .get('/api/store/me/power-ups')
      .set('Cookie', cookie)
      .expect(200);

    expect(catalog.body as CatalogEntry[]).toHaveLength(0);
    expect(library.body as CatalogEntry[]).toHaveLength(0);

    const owned = await prisma.userPowerUp.count({ where: { userId } });

    expect(owned).toBe(1);

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('should refuse buying the same power-up twice', async () => {
    const powerUp = await seedPowerUp(10);
    await prisma.wallet.create({ data: { userId, coins: 100 } });

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(201);

    await request(httpServer())
      .post(`/api/store/power-ups/${powerUp.id}/purchase`)
      .set('Cookie', cookie)
      .expect(409);

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });

    expect(wallet.coins).toBe(90);
  });

  it('should reject an unknown power-up', async () => {
    await request(httpServer())
      .post(
        '/api/store/power-ups/00000000-0000-0000-0000-000000000000/purchase',
      )
      .set('Cookie', cookie)
      .expect(404);
  });
});
