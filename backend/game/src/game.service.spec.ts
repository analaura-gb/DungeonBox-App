import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RunStatus } from '../generated/prisma/client';
import { GameService } from './game.service';
import { FinishRunData, RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';
import { FinishRunDto } from './dto/finish-run.dto';
import { StoreCharacter, StoreClient } from './store/store.client';
import { RankingClient, RankingRun } from './ranking/ranking.client';

describe('GameService', () => {
  let service: GameService;

  const user = { sub: 'user-1', email: 'player@email.com' };

  const weaponLevels = Array.from({ length: 8 }, (_, i) => ({
    level: i + 1,
    damage: 10 + i,
  }));

  const weapons = [
    { id: 'compiler', behavior: 'projectile', levels: weaponLevels },
    { id: 'duck', behavior: 'orbit', levels: weaponLevels },
  ];

  const passiveItems = [
    { id: 'espresso', stat: 'speed', value: 0.08, maxLevel: 8 },
  ];

  const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60 * 1000);

  const run = (overrides: Record<string, unknown> = {}) => ({
    id: 'run-1',
    userId: 'user-1',
    characterId: 'ana-laura',
    status: RunStatus.IN_PROGRESS,
    score: 0,
    kills: 0,
    levelReached: 1,
    survivedTime: 0,
    coinsEarned: 0,
    startedAt: minutesAgo(5),
    finishedAt: null,
    startWeaponId: 'compiler',
    ...overrides,
  });

  const validResult = (): FinishRunDto => ({
    won: false,
    score: 1234,
    kills: 80,
    levelReached: 9,
    survivedTime: 240,
    weapons: [
      { id: 'compiler', level: 3 },
      { id: 'duck', level: 1 },
    ],
    passiveItems: [{ id: 'espresso', level: 2 }],
  });

  const repositoryMock = {
    create: mock(
      (_userId: string, _characterId: string, _startWeaponId: string | null) =>
        Promise.resolve(run()),
    ),
    findByIdForUser: mock((_id: string, _userId: string) =>
      Promise.resolve(run() as ReturnType<typeof run> | null),
    ),
    finish: mock((_id: string, data: FinishRunData) =>
      Promise.resolve({
        ...run(),
        ...data,
        finishedAt: new Date(),
        weapons: data.weapons.map((w) => ({
          id: 'rw',
          runId: 'run-1',
          weaponId: w.id,
          level: w.level,
        })),
        passiveItems: data.passiveItems.map((p) => ({
          id: 'rp',
          runId: 'run-1',
          passiveItemId: p.id,
          level: p.level,
        })),
      }),
    ),
    findBestFinished: mock((_userId: string, _limit: number) =>
      Promise.resolve([run({ status: RunStatus.DIED, score: 500 })]),
    ),
  };

  const enemy = (id: string, bossOrder: number | null) => ({
    id,
    name: id,
    imageUrl: null,
    color: '#7cff9b',
    hp: 10,
    speed: 60,
    damage: 7,
    radius: 15,
    xp: 1,
    score: 10,
    minTime: 0,
    weight: bossOrder ? 0 : 100,
    splits: 0,
    bossOrder,
  });

  const catalogMock = {
    findEnemies: mock(() => Promise.resolve([enemy('bug', null)])),
    findBosses: mock(() =>
      Promise.resolve([enemy('calc1', 1), enemy('thesis', 2)]),
    ),
    findPickups: mock(() =>
      Promise.resolve([
        { id: 'heal', name: 'Free Pizza', value: 22, dropChance: 0.012 },
      ]),
    ),
    findWeapons: mock(() => Promise.resolve(weapons)),
    findWeapon: mock((id: string) =>
      Promise.resolve(weapons.find((w) => w.id === id) ?? null),
    ),
    findPassiveItems: mock(() => Promise.resolve(passiveItems)),
  };

  const storeMock = {
    isConfigured: mock(() => true),
    listOwnedCharacters: mock(
      (_userId: string, _email: string): Promise<StoreCharacter[]> =>
        Promise.resolve([{ id: 'ana-laura', initialWeaponId: 'compiler' }]),
    ),
    creditCoins: mock((_userId: string, _amount: number) => Promise.resolve()),
  };

  const rankingMock = {
    isConfigured: mock(() => true),
    recordRun: mock((_userId: string, _run: RankingRun) => Promise.resolve()),
  };

  beforeEach(async () => {
    Object.values(repositoryMock).forEach((m) => m.mockClear());
    Object.values(storeMock).forEach((m) => m.mockClear());
    Object.values(rankingMock).forEach((m) => m.mockClear());
    storeMock.isConfigured.mockImplementation(() => true);
    repositoryMock.findByIdForUser.mockImplementation(() =>
      Promise.resolve(run()),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: RunsRepository, useValue: repositoryMock },
        { provide: CatalogRepository, useValue: catalogMock },
        { provide: StoreClient, useValue: storeMock },
        { provide: RankingClient, useValue: rankingMock },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('startRun', () => {
    it('should create a run with the starting weapon of an owned character', async () => {
      const result = await service.startRun(user, {
        characterId: 'ana-laura',
      });

      expect(storeMock.listOwnedCharacters).toHaveBeenCalledWith(
        'user-1',
        'player@email.com',
      );
      expect(repositoryMock.create).toHaveBeenCalledWith(
        'user-1',
        'ana-laura',
        'compiler',
      );
      expect(result.id).toBe('run-1');
      expect(result.characterId).toBe('ana-laura');
    });

    it('should reject a character the user does not own', async () => {
      await expect(
        service.startRun(user, { characterId: 'enzo' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });

    it('should reject a character whose starting weapon the game does not have', async () => {
      storeMock.listOwnedCharacters.mockResolvedValueOnce([
        { id: 'ana-laura', initialWeaponId: 'bazooka' },
      ]);

      await expect(
        service.startRun(user, { characterId: 'ana-laura' }),
      ).rejects.toThrow(BadRequestException);
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });

    it('should not start a run when the store cannot answer', async () => {
      storeMock.listOwnedCharacters.mockRejectedValueOnce(
        new Error('Store answered 500 when listing the characters'),
      );

      await expect(
        service.startRun(user, { characterId: 'ana-laura' }),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(repositoryMock.create).not.toHaveBeenCalled();
    });

    it('should skip the store check when no store is configured', async () => {
      storeMock.isConfigured.mockImplementation(() => false);

      await service.startRun(user, { characterId: 'anyone' });

      expect(storeMock.listOwnedCharacters).not.toHaveBeenCalled();
      expect(repositoryMock.create).toHaveBeenCalledWith(
        'user-1',
        'anyone',
        null,
      );
    });
  });

  describe('finishRun', () => {
    it('should save the result and the coins earned', async () => {
      const result = await service.finishRun('user-1', 'run-1', validResult());

      expect(repositoryMock.finish).toHaveBeenCalledTimes(1);
      const [, data] = repositoryMock.finish.mock.calls[0];
      expect(data.status).toBe(RunStatus.DIED);
      expect(data.coinsEarned).toBe(12);
      expect(result.coinsEarned).toBe(12);
      expect(result.weapons).toEqual([
        { id: 'compiler', level: 3 },
        { id: 'duck', level: 1 },
      ]);
      expect(storeMock.creditCoins).toHaveBeenCalledWith('user-1', 12);
    });

    it('should send the run and its build to the ranking', async () => {
      await service.finishRun('user-1', 'run-1', validResult());

      expect(rankingMock.recordRun).toHaveBeenCalledTimes(1);

      const [userId, sent] = rankingMock.recordRun.mock.calls[0];

      expect(userId).toBe('user-1');
      expect(sent.runId).toBe('run-1');
      expect(sent.weapons).toEqual([
        { id: 'compiler', level: 3 },
        { id: 'duck', level: 1 },
      ]);
      expect(sent.passiveItems).toEqual(validResult().passiveItems);
    });

    it('should wait for the ranking and the store before answering', async () => {
      const order: string[] = [];
      rankingMock.recordRun.mockImplementationOnce(async () => {
        await Bun.sleep(40);
        order.push('ranking');
      });
      storeMock.creditCoins.mockImplementationOnce(async () => {
        await Bun.sleep(5);
        order.push('store');
      });

      await service.finishRun('user-1', 'run-1', validResult());

      expect(order).toEqual(['ranking', 'store']);
    });

    it('should still finish the run when the ranking cannot record it', async () => {
      rankingMock.recordRun.mockRejectedValueOnce(new Error('Ranking is down'));

      const result = await service.finishRun('user-1', 'run-1', validResult());

      expect(result.coinsEarned).toBe(12);
      expect(storeMock.creditCoins).toHaveBeenCalled();
    });

    it('should not send the run when no ranking is configured', async () => {
      rankingMock.isConfigured.mockImplementationOnce(() => false);

      await service.finishRun('user-1', 'run-1', validResult());

      expect(rankingMock.recordRun).not.toHaveBeenCalled();
    });

    it('should still finish the run when the store cannot credit the coins', async () => {
      storeMock.creditCoins.mockRejectedValueOnce(new Error('Store is down'));

      const result = await service.finishRun('user-1', 'run-1', validResult());

      expect(result.coinsEarned).toBe(12);
    });

    it('should not credit a run without coins or without a store', async () => {
      await service.finishRun('user-1', 'run-1', {
        ...validResult(),
        score: 99,
      });

      storeMock.isConfigured.mockImplementation(() => false);
      await service.finishRun('user-1', 'run-1', validResult());

      expect(storeMock.creditCoins).not.toHaveBeenCalled();
    });

    it('should mark a full-length run as won', async () => {
      repositoryMock.findByIdForUser.mockImplementation(() =>
        Promise.resolve(run({ startedAt: minutesAgo(11) })),
      );

      await service.finishRun('user-1', 'run-1', {
        ...validResult(),
        won: true,
        survivedTime: 600,
      });

      const [, data] = repositoryMock.finish.mock.calls[0];
      expect(data.status).toBe(RunStatus.WON);
    });

    it('should return 404 for a run of another user', async () => {
      repositoryMock.findByIdForUser.mockImplementation(() =>
        Promise.resolve(null),
      );

      await expect(
        service.finishRun('user-2', 'run-1', validResult()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not finish a run twice', async () => {
      repositoryMock.findByIdForUser.mockImplementation(() =>
        Promise.resolve(run({ status: RunStatus.DIED })),
      );

      await expect(
        service.finishRun('user-1', 'run-1', validResult()),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject a survived time longer than the run', async () => {
      repositoryMock.findByIdForUser.mockImplementation(() =>
        Promise.resolve(run({ startedAt: minutesAgo(1) })),
      );

      await expect(
        service.finishRun('user-1', 'run-1', validResult()),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a won run that did not last the whole semester', async () => {
      await expect(
        service.finishRun('user-1', 'run-1', { ...validResult(), won: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unknown, repeated or over-leveled items', async () => {
      const cases: Partial<FinishRunDto>[] = [
        {
          weapons: [
            { id: 'compiler', level: 1 },
            { id: 'laser', level: 1 },
          ],
        },
        {
          weapons: [
            { id: 'compiler', level: 1 },
            { id: 'compiler', level: 2 },
          ],
        },
        { weapons: [{ id: 'compiler', level: 9 }] },
        { passiveItems: [{ id: 'espresso', level: 9 }] },
      ];

      for (const change of cases) {
        await expect(
          service.finishRun('user-1', 'run-1', { ...validResult(), ...change }),
        ).rejects.toThrow(BadRequestException);
      }
      expect(repositoryMock.finish).not.toHaveBeenCalled();
    });

    it('should reject a result without the starting weapon', async () => {
      await expect(
        service.finishRun('user-1', 'run-1', {
          ...validResult(),
          weapons: [{ id: 'duck', level: 2 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not require a starting weapon when the run started without the store', async () => {
      repositoryMock.findByIdForUser.mockImplementation(() =>
        Promise.resolve(run({ startWeaponId: null })),
      );

      await service.finishRun('user-1', 'run-1', {
        ...validResult(),
        weapons: [{ id: 'duck', level: 2 }],
      });

      expect(repositoryMock.finish).toHaveBeenCalled();
    });
  });

  describe('listBest', () => {
    it('should return the summaries of the best runs', async () => {
      const result = await service.listBest('user-1');

      expect(repositoryMock.findBestFinished).toHaveBeenCalledWith(
        'user-1',
        10,
      );
      expect(result).toHaveLength(1);
      expect(result[0].score).toBe(500);
      expect(result[0]).not.toHaveProperty('userId');
    });
  });

  describe('getCatalog', () => {
    it('should return enemies, bosses, pickups, weapons and passive items', async () => {
      const result = await service.getCatalog();

      expect(result.enemies.map((e) => [e.id, e.boss])).toEqual([
        ['bug', false],
      ]);
      expect(result.bosses.map((e) => [e.id, e.boss])).toEqual([
        ['calc1', true],
        ['thesis', true],
      ]);
      expect(result.enemies[0]).not.toHaveProperty('bossOrder');
      expect(result.pickups[0].value).toBe(22);
      expect(result.weapons.map((w) => [w.id, w.levels.length])).toEqual([
        ['compiler', 8],
        ['duck', 8],
      ]);
      expect(result.passiveItems[0].stat).toBe('speed');
    });
  });
});
