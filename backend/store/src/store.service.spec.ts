import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StoreService } from './store.service';
import { CatalogRepository } from './catalog/catalog.repository';
import { LibraryRepository } from './library/library.repository';
import { WalletsRepository } from './wallets/wallets.repository';
import { PrismaService } from './prisma/prisma.service';
import {
  Character,
  PowerUp,
  UserCharacter,
  UserPowerUp,
  Wallet,
} from '../generated/prisma/client';

describe('StoreService', () => {
  let service: StoreService;

  const powerUp: PowerUp = {
    id: 'power-up-1',
    name: 'Iron Will',
    price: 100,
    attack: 2,
    defense: 3,
    health: 10,
    movementSpeed: 1.1,
    attackSpeed: 1.2,
    projectileSpeed: 1,
    projectileSize: 1,
    regeneration: 0,
    imageUrl: '/assets/catalog/coffee.png',
    requiredPowerUpId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const character: Character = {
    id: 'character-1',
    name: 'Knight',
    title: 'Royal Guard',
    description: 'Slow and sturdy.',
    color: '#ffd84d',
    price: 250,
    initialWeaponId: 'weapon-1',
    hp: 140,
    speed: 180,
    damageMul: 1.1,
    xpMul: 1,
    pickupRadius: 90,
    imageUrl: null,
    spriteUrl: null,
    walkSpriteUrl: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const powerUpResponse = {
    id: 'power-up-1',
    name: 'Iron Will',
    price: 100,
    attack: 2,
    defense: 3,
    health: 10,
    movementSpeed: 1.1,
    attackSpeed: 1.2,
    projectileSpeed: 1,
    projectileSize: 1,
    regeneration: 0,
    imageUrl: '/assets/catalog/coffee.png',
    requiredPowerUpId: null,
  };

  const characterResponse = {
    id: 'character-1',
    name: 'Knight',
    title: 'Royal Guard',
    description: 'Slow and sturdy.',
    color: '#ffd84d',
    price: 250,
    initialWeaponId: 'weapon-1',
    hp: 140,
    speed: 180,
    damageMul: 1.1,
    xpMul: 1,
    pickupRadius: 90,
    imageUrl: null,
    spriteUrl: null,
    walkSpriteUrl: null,
  };

  const freeCharacter: Character = {
    ...character,
    id: 'character-free',
    name: 'Squire',
    price: 0,
  };

  const wallet: Wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    coins: 500,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const catalogRepositoryMock = {
    findPowerUps: mock((): Promise<PowerUp[]> => Promise.resolve([powerUp])),
    findPowerUpById: mock(
      (_id: string): Promise<PowerUp | null> => Promise.resolve(powerUp),
    ),
    findCharacters: mock(
      (): Promise<Character[]> => Promise.resolve([character]),
    ),
    findCharacterById: mock(
      (_id: string): Promise<Character | null> => Promise.resolve(character),
    ),
    findFreeCharacters: mock(
      (): Promise<Character[]> => Promise.resolve([freeCharacter]),
    ),
  };

  const libraryRepositoryMock = {
    findPowerUpsByUser: mock((_userId: string) =>
      Promise.resolve([{ powerUp }]),
    ),
    findCharactersByUser: mock((_userId: string) =>
      Promise.resolve([{ character }]),
    ),
    findPowerUpOwnership: mock(
      (_userId: string, _powerUpId: string): Promise<UserPowerUp | null> =>
        Promise.resolve(null),
    ),
    findCharacterOwnership: mock(
      (_userId: string, _characterId: string): Promise<UserCharacter | null> =>
        Promise.resolve(null),
    ),
    grantPowerUp: mock((_userId: string, _powerUpId: string) =>
      Promise.resolve(),
    ),
    grantCharacter: mock((_userId: string, _characterId: string) =>
      Promise.resolve(),
    ),
  };

  const walletsRepositoryMock = {
    findByUserId: mock(
      (_userId: string): Promise<Wallet | null> => Promise.resolve(wallet),
    ),
    ensureForUser: mock(
      (_userId: string): Promise<Wallet> => Promise.resolve(wallet),
    ),
    debit: mock(
      (_userId: string, amount: number): Promise<{ coins: number }> =>
        Promise.resolve({ coins: wallet.coins - amount }),
    ),
    credit: mock(
      (_userId: string, amount: number): Promise<{ coins: number }> =>
        Promise.resolve({ coins: wallet.coins + amount }),
    ),
  };

  const prismaMock = {
    $transaction: mock(
      <T>(run: (tx: unknown) => Promise<T>): Promise<T> => run({}),
    ),
  };

  beforeEach(async () => {
    catalogRepositoryMock.findPowerUpById.mockClear();
    catalogRepositoryMock.findCharacterById.mockClear();
    libraryRepositoryMock.findPowerUpOwnership.mockClear();
    libraryRepositoryMock.findCharacterOwnership.mockClear();
    libraryRepositoryMock.grantPowerUp.mockClear();
    libraryRepositoryMock.grantCharacter.mockClear();
    walletsRepositoryMock.ensureForUser.mockClear();
    walletsRepositoryMock.debit.mockClear();
    walletsRepositoryMock.findByUserId.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CatalogRepository, useValue: catalogRepositoryMock },
        { provide: LibraryRepository, useValue: libraryRepositoryMock },
        { provide: WalletsRepository, useValue: walletsRepositoryMock },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
  });

  describe('creditCoins', () => {
    it('should add the coins to the wallet of the user', async () => {
      const result = await service.creditCoins('user-1', 40);

      expect(walletsRepositoryMock.credit).toHaveBeenCalledWith('user-1', 40);
      expect(result).toEqual({ coins: wallet.coins + 40 });
    });
  });

  describe('getOrCreateWallet', () => {
    it('should return only the balance', async () => {
      const result = await service.getOrCreateWallet('user-1');

      expect(result).toEqual({ coins: 500 });
    });

    it('should not write when the wallet is already there', async () => {
      await service.getOrCreateWallet('user-1');

      expect(walletsRepositoryMock.ensureForUser).not.toHaveBeenCalled();
    });

    it('should create the wallet when the register call never landed', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce(null);
      walletsRepositoryMock.ensureForUser.mockResolvedValueOnce({
        ...wallet,
        coins: 0,
      });

      const result = await service.getOrCreateWallet('user-without-wallet');

      expect(walletsRepositoryMock.ensureForUser).toHaveBeenCalledWith(
        'user-without-wallet',
      );

      expect(result).toEqual({ coins: 0 });
    });
  });

  describe('listPowerUps', () => {
    it('should expose only the catalog fields', async () => {
      const result = await service.listPowerUps();

      expect(result).toEqual([powerUpResponse]);
    });
  });

  describe('listCharacters', () => {
    it('should expose only the catalog fields', async () => {
      const result = await service.listCharacters();

      expect(result).toEqual([characterResponse]);
    });
  });

  describe('listOwnedPowerUps', () => {
    it('should unwrap the ownership row into the catalog fields', async () => {
      const result = await service.listOwnedPowerUps('user-1');

      expect(result).toEqual([powerUpResponse]);
    });
  });

  describe('listOwnedCharacters', () => {
    it('should list the free characters and unwrap the ownership rows', async () => {
      const result = await service.listOwnedCharacters('user-1');

      expect(result.map((c) => c.id)).toEqual([
        'character-free',
        'character-1',
      ]);
      expect(result[1]).toEqual(characterResponse);
    });

    it('should list a free character once even if it was bought before it became free', async () => {
      libraryRepositoryMock.findCharactersByUser.mockResolvedValueOnce([
        { character: freeCharacter },
      ]);

      const result = await service.listOwnedCharacters('user-1');

      expect(result.map((c) => c.id)).toEqual(['character-free']);
    });
  });

  describe('purchasePowerUp', () => {
    const nextTier = {
      ...powerUp,
      id: 'power-up-2',
      requiredPowerUpId: 'power-up-1',
    };

    it('should refuse a tier whose previous power-up is not owned', async () => {
      catalogRepositoryMock.findPowerUpById.mockResolvedValueOnce(nextTier);

      await expect(
        service.purchasePowerUp('user-1', 'power-up-2'),
      ).rejects.toThrow(ForbiddenException);

      expect(libraryRepositoryMock.findPowerUpOwnership).toHaveBeenCalledWith(
        'user-1',
        'power-up-1',
      );
      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
    });

    it('should sell a tier once the previous power-up is owned', async () => {
      catalogRepositoryMock.findPowerUpById.mockResolvedValueOnce(nextTier);
      libraryRepositoryMock.findPowerUpOwnership
        .mockResolvedValueOnce({
          id: 'ownership-1',
          userId: 'user-1',
          powerUpId: 'power-up-1',
          createdAt: new Date(),
        })
        .mockResolvedValueOnce(null);

      await service.purchasePowerUp('user-1', 'power-up-2');

      expect(libraryRepositoryMock.grantPowerUp).toHaveBeenCalled();
    });

    it('should report the balance the debit returned', async () => {
      walletsRepositoryMock.debit.mockResolvedValueOnce({ coins: 400 });

      const result = await service.purchasePowerUp('user-1', 'power-up-1');

      expect(result).toEqual({
        message: 'Power-up purchased successfully',
        remainingCoins: 400,
      });

      expect(walletsRepositoryMock.debit).toHaveBeenCalledWith(
        'user-1',
        powerUp.price,
        expect.anything(),
      );
    });

    it('should refuse a purchase when the wallet does not exist', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow('Not enough coins');

      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
    });

    it('should reject an unknown power-up', async () => {
      catalogRepositoryMock.findPowerUpById.mockResolvedValueOnce(null);

      await expect(
        service.purchasePowerUp('user-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject a power-up the user already owns', async () => {
      libraryRepositoryMock.findPowerUpOwnership.mockResolvedValueOnce({
        id: 'ownership-1',
        userId: 'user-1',
        powerUpId: 'power-up-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject a purchase the balance cannot cover', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce({
        ...wallet,
        coins: powerUp.price - 1,
      });

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow('Not enough coins');
    });

    it('should not debit nor grant when the balance cannot cover it', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce({
        ...wallet,
        coins: powerUp.price - 1,
      });

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow('Not enough coins');

      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
      expect(libraryRepositoryMock.grantPowerUp).not.toHaveBeenCalled();
    });

    it('should let the grant failure undo the debit', async () => {
      libraryRepositoryMock.grantPowerUp.mockRejectedValueOnce(
        new Error('duplicate key'),
      );

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow('duplicate key');

      expect(walletsRepositoryMock.debit).toHaveBeenCalled();
    });

    it('should not disguise a debit failure as something else', async () => {
      walletsRepositoryMock.debit.mockRejectedValueOnce(
        new Error('connection terminated'),
      );

      await expect(
        service.purchasePowerUp('user-1', 'power-up-1'),
      ).rejects.toThrow('connection terminated');
    });
  });

  describe('purchaseCharacter', () => {
    it('should report the balance the debit returned', async () => {
      walletsRepositoryMock.debit.mockResolvedValueOnce({ coins: 250 });

      const result = await service.purchaseCharacter('user-1', 'character-1');

      expect(result).toEqual({
        message: 'Character purchased successfully',
        remainingCoins: 250,
      });

      expect(walletsRepositoryMock.debit).toHaveBeenCalledWith(
        'user-1',
        character.price,
        expect.anything(),
      );
    });

    it('should refuse a purchase when the wallet does not exist', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce(null);

      await expect(
        service.purchaseCharacter('user-1', 'character-1'),
      ).rejects.toThrow('Not enough coins');

      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
    });

    it('should reject an unknown character', async () => {
      catalogRepositoryMock.findCharacterById.mockResolvedValueOnce(null);

      await expect(
        service.purchaseCharacter('user-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject buying a free character, since everyone owns it', async () => {
      catalogRepositoryMock.findCharacterById.mockResolvedValueOnce(
        freeCharacter,
      );

      await expect(
        service.purchaseCharacter('user-1', 'character-free'),
      ).rejects.toThrow(ConflictException);

      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
    });

    it('should reject a character the user already owns', async () => {
      libraryRepositoryMock.findCharacterOwnership.mockResolvedValueOnce({
        id: 'ownership-1',
        userId: 'user-1',
        characterId: 'character-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(
        service.purchaseCharacter('user-1', 'character-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should not debit nor grant when the balance cannot cover it', async () => {
      walletsRepositoryMock.findByUserId.mockResolvedValueOnce({
        ...wallet,
        coins: character.price - 1,
      });

      await expect(
        service.purchaseCharacter('user-1', 'character-1'),
      ).rejects.toThrow('Not enough coins');

      expect(walletsRepositoryMock.debit).not.toHaveBeenCalled();
      expect(libraryRepositoryMock.grantCharacter).not.toHaveBeenCalled();
    });

    it('should let the grant failure undo the debit', async () => {
      libraryRepositoryMock.grantCharacter.mockRejectedValueOnce(
        new Error('duplicate key'),
      );

      await expect(
        service.purchaseCharacter('user-1', 'character-1'),
      ).rejects.toThrow('duplicate key');

      expect(walletsRepositoryMock.debit).toHaveBeenCalled();
    });
  });
});
