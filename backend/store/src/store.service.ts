import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogRepository } from './catalog/catalog.repository';
import { LibraryRepository } from './library/library.repository';
import { WalletsRepository } from './wallets/wallets.repository';
import { PrismaService } from './prisma/prisma.service';
import { Character, PowerUp } from '../generated/prisma/client';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogRepository: CatalogRepository,
    private readonly libraryRepository: LibraryRepository,
    private readonly walletsRepository: WalletsRepository,
  ) {}

  async listPowerUps() {
    const powerUps = await this.catalogRepository.findPowerUps();

    return powerUps.map((powerUp) => this.toPowerUpResponse(powerUp));
  }

  async listCharacters() {
    const characters = await this.catalogRepository.findCharacters();

    return characters.map((character) => this.toCharacterResponse(character));
  }

  async getOrCreateWallet(userId: string) {
    const wallet = await this.walletsRepository.findByUserId(userId);

    if (wallet) {
      return { coins: wallet.coins };
    }

    const created = await this.walletsRepository.ensureForUser(userId);

    return { coins: created.coins };
  }

  creditCoins(userId: string, amount: number) {
    return this.walletsRepository.credit(userId, amount);
  }

  async listOwnedPowerUps(userId: string) {
    const owned = await this.libraryRepository.findPowerUpsByUser(userId);

    return owned.map((entry) => this.toPowerUpResponse(entry.powerUp));
  }

  async listOwnedCharacters(userId: string) {
    const [free, owned] = await Promise.all([
      this.catalogRepository.findFreeCharacters(),
      this.libraryRepository.findCharactersByUser(userId),
    ]);

    const characters = new Map(
      [...free, ...owned.map((entry) => entry.character)].map((character) => [
        character.id,
        character,
      ]),
    );

    return [...characters.values()].map((character) =>
      this.toCharacterResponse(character),
    );
  }

  async purchasePowerUp(userId: string, powerUpId: string) {
    const powerUp = await this.catalogRepository.findPowerUpById(powerUpId);

    if (!powerUp) {
      throw new NotFoundException('Power-up not found');
    }

    if (powerUp.requiredPowerUpId) {
      const previous = await this.libraryRepository.findPowerUpOwnership(
        userId,
        powerUp.requiredPowerUpId,
      );

      if (!previous) {
        throw new ForbiddenException('Buy the previous power-up first');
      }
    }

    const wallet = await this.walletsRepository.findByUserId(userId);

    if (!wallet || wallet.coins < powerUp.price) {
      throw new HttpException('Not enough coins', HttpStatus.PAYMENT_REQUIRED);
    }

    const owned = await this.libraryRepository.findPowerUpOwnership(
      userId,
      powerUpId,
    );

    if (owned) {
      throw new ConflictException('Power-up already owned');
    }

    return this.prisma.$transaction(async (tx) => {
      const debited = await this.walletsRepository.debit(
        userId,
        powerUp.price,
        tx,
      );

      await this.libraryRepository.grantPowerUp(userId, powerUpId, tx);

      return this.purchaseResponse('Power-up', debited.coins);
    });
  }

  async purchaseCharacter(userId: string, characterId: string) {
    const character =
      await this.catalogRepository.findCharacterById(characterId);

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    if (character.price === 0) {
      throw new ConflictException('Character already owned');
    }

    const wallet = await this.walletsRepository.findByUserId(userId);

    if (!wallet || wallet.coins < character.price) {
      throw new HttpException('Not enough coins', HttpStatus.PAYMENT_REQUIRED);
    }

    const owned = await this.libraryRepository.findCharacterOwnership(
      userId,
      characterId,
    );

    if (owned) {
      throw new ConflictException('Character already owned');
    }

    return this.prisma.$transaction(async (tx) => {
      const debited = await this.walletsRepository.debit(
        userId,
        character.price,
        tx,
      );

      await this.libraryRepository.grantCharacter(userId, characterId, tx);

      return this.purchaseResponse('Character', debited.coins);
    });
  }

  private toPowerUpResponse(powerUp: PowerUp) {
    return {
      id: powerUp.id,
      name: powerUp.name,
      price: powerUp.price,
      attack: powerUp.attack,
      defense: powerUp.defense,
      health: powerUp.health,
      movementSpeed: powerUp.movementSpeed,
      attackSpeed: powerUp.attackSpeed,
      projectileSpeed: powerUp.projectileSpeed,
      projectileSize: powerUp.projectileSize,
      regeneration: powerUp.regeneration,
      imageUrl: powerUp.imageUrl,
      requiredPowerUpId: powerUp.requiredPowerUpId,
    };
  }

  private toCharacterResponse(character: Character) {
    return {
      id: character.id,
      name: character.name,
      title: character.title,
      description: character.description,
      color: character.color,
      price: character.price,
      initialWeaponId: character.initialWeaponId,
      hp: character.hp,
      speed: character.speed,
      damageMul: character.damageMul,
      xpMul: character.xpMul,
      pickupRadius: character.pickupRadius,
      imageUrl: character.imageUrl,
      spriteUrl: character.spriteUrl,
      walkSpriteUrl: character.walkSpriteUrl,
    };
  }

  private purchaseResponse(subject: string, remainingCoins: number) {
    return {
      message: `${subject} purchased successfully`,
      remainingCoins,
    };
  }
}
