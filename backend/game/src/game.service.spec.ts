import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RunStatus } from '../generated/prisma/client';
import { GameService } from './game.service';
import { FinishRunData, RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';
import { FinishRunDto } from './dto/finish-run.dto';

describe('GameService', () => {
  let service: GameService;

  const character = {
    id: 'ana-laura',
    name: 'Ana Laura',
    startWeaponId: 'compiler',
  };

  const weapons = [
    { id: 'compiler', name: 'Programming Balloon', maxLevel: 8 },
    { id: 'duck', name: 'Algorithm Book', maxLevel: 8 },
  ];

  const passiveItems = [{ id: 'espresso', name: 'Espresso Shot', maxLevel: 8 }];

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
    character,
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
    findCharacter: mock((_id: string) =>
      Promise.resolve(character as typeof character | null),
    ),
    findWeapons: mock(() => Promise.resolve(weapons)),
    findPassiveItems: mock(() => Promise.resolve(passiveItems)),
    create: mock((_userId: string, _characterId: string) =>
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
    icon: '🐛',
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
  };

  beforeEach(async () => {
    Object.values(repositoryMock).forEach((m) => m.mockClear());
    repositoryMock.findCharacter.mockImplementation(() =>
      Promise.resolve(character),
    );
    repositoryMock.findByIdForUser.mockImplementation(() =>
      Promise.resolve(run()),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: RunsRepository, useValue: repositoryMock },
        { provide: CatalogRepository, useValue: catalogMock },
      ],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  describe('startRun', () => {
    it('should create a run for the user', async () => {
      const result = await service.startRun('user-1', {
        characterId: 'ana-laura',
      });

      expect(repositoryMock.create).toHaveBeenCalledWith('user-1', 'ana-laura');
      expect(result.id).toBe('run-1');
      expect(result.characterId).toBe('ana-laura');
    });

    it('should reject an unknown character', async () => {
      repositoryMock.findCharacter.mockImplementation(() =>
        Promise.resolve(null),
      );

      await expect(
        service.startRun('user-1', { characterId: 'nobody' }),
      ).rejects.toThrow(BadRequestException);
      expect(repositoryMock.create).not.toHaveBeenCalled();
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
    it('should return enemies, bosses and pickups', async () => {
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
    });
  });
});
