import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  Run,
  RunPassiveItem,
  RunStatus,
  RunWeapon,
} from '../generated/prisma/client';
import { FinishRunDto, RunItemDto } from './dto/finish-run.dto';
import { StartRunDto } from './dto/start-run.dto';
import { RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';
import { StoreCharacter, StoreClient } from './store/store.client';
import { RankingClient } from './ranking/ranking.client';

const TIME_LIMIT_SECONDS = 10 * 60;
const TIME_TOLERANCE_SECONDS = 5;
const SCORE_PER_COIN = 100;
const HIGH_SCORES_LIMIT = 10;

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly runsRepository: RunsRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly storeClient: StoreClient,
    private readonly rankingClient: RankingClient,
  ) {}

  async getCatalog() {
    const [enemies, bosses, pickups, weapons, passiveItems] = await Promise.all(
      [
        this.catalogRepository.findEnemies(),
        this.catalogRepository.findBosses(),
        this.catalogRepository.findPickups(),
        this.catalogRepository.findWeapons(),
        this.catalogRepository.findPassiveItems(),
      ],
    );

    const toEnemy = ({ bossOrder, ...enemy }: (typeof enemies)[number]) => ({
      ...enemy,
      boss: bossOrder !== null,
    });

    return {
      enemies: enemies.map(toEnemy),
      bosses: bosses.map(toEnemy),
      pickups,
      weapons,
      passiveItems,
    };
  }

  async startRun(
    user: { sub: string; email: string },
    { characterId }: StartRunDto,
  ) {
    const startWeaponId = await this.findStartWeapon(user, characterId);

    const run = await this.runsRepository.create(
      user.sub,
      characterId,
      startWeaponId,
    );

    return {
      id: run.id,
      characterId: run.characterId,
      startedAt: run.startedAt,
    };
  }

  async finishRun(userId: string, runId: string, body: FinishRunDto) {
    const run = await this.runsRepository.findByIdForUser(runId, userId);

    if (!run) {
      throw new NotFoundException('Run not found');
    }

    if (run.status !== RunStatus.IN_PROGRESS) {
      throw new ConflictException('Run already finished');
    }

    const elapsedSeconds = (Date.now() - run.startedAt.getTime()) / 1000;

    if (body.survivedTime > elapsedSeconds + TIME_TOLERANCE_SECONDS) {
      throw new BadRequestException('Survived time is longer than the run');
    }

    if (body.won && body.survivedTime < TIME_LIMIT_SECONDS - 1) {
      throw new BadRequestException('A won run must last the whole semester');
    }

    await this.checkItems(body, run.startWeaponId);

    const finished = await this.runsRepository.finish(run.id, {
      status: body.won ? RunStatus.WON : RunStatus.DIED,
      score: body.score,
      kills: body.kills,
      levelReached: body.levelReached,
      survivedTime: body.survivedTime,
      coinsEarned: Math.floor(body.score / SCORE_PER_COIN),
      weapons: body.weapons,
      passiveItems: body.passiveItems,
    });

    await this.sendToRanking(finished);
    await this.creditCoins(finished);

    return {
      ...this.toSummary(finished),
      weapons: finished.weapons.map((w) => ({
        id: w.weaponId,
        level: w.level,
      })),
      passiveItems: finished.passiveItems.map((p) => ({
        id: p.passiveItemId,
        level: p.level,
      })),
    };
  }

  async listBest(userId: string) {
    const runs = await this.runsRepository.findBestFinished(
      userId,
      HIGH_SCORES_LIMIT,
    );

    return runs.map((run) => this.toSummary(run));
  }

  private async sendToRanking(
    run: Run & { weapons: RunWeapon[]; passiveItems: RunPassiveItem[] },
  ) {
    if (!this.rankingClient.isConfigured()) return;

    try {
      await this.rankingClient.recordRun(run.userId, {
        runId: run.id,
        characterId: run.characterId,
        won: run.status === RunStatus.WON,
        score: run.score,
        enemiesKilled: run.kills,
        survivedTime: run.survivedTime,
        coinsCollected: run.coinsEarned,
        weapons: run.weapons.map((w) => ({ id: w.weaponId, level: w.level })),
        passiveItems: run.passiveItems.map((p) => ({
          id: p.passiveItemId,
          level: p.level,
        })),
      });
    } catch (error) {
      this.logger.warn(
        `Could not send run ${run.id} to the ranking: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async creditCoins(run: Run) {
    if (!this.storeClient.isConfigured() || run.coinsEarned <= 0) return;

    try {
      await this.storeClient.creditCoins(run.userId, run.coinsEarned);
    } catch (error) {
      this.logger.warn(
        `Could not credit the coins of run ${run.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async findStartWeapon(
    user: { sub: string; email: string },
    characterId: string,
  ) {
    if (!this.storeClient.isConfigured()) return null;

    let characters: StoreCharacter[];

    try {
      characters = await this.storeClient.listOwnedCharacters(
        user.sub,
        user.email,
      );
    } catch (error) {
      this.logger.warn(
        `Could not reach the store: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new ServiceUnavailableException('Store is unavailable');
    }

    const character = characters.find((c) => c.id === characterId);

    if (!character) {
      throw new ForbiddenException('Character not owned');
    }

    const weapon = await this.catalogRepository.findWeapon(
      character.initialWeaponId,
    );

    if (!weapon) {
      throw new BadRequestException('Unknown starting weapon');
    }

    return weapon.id;
  }

  private async checkItems(body: FinishRunDto, startWeaponId: string | null) {
    const [weapons, passiveItems] = await Promise.all([
      this.catalogRepository.findWeapons(),
      this.catalogRepository.findPassiveItems(),
    ]);

    this.checkList(
      body.weapons,
      weapons.map((w) => ({ id: w.id, maxLevel: w.levels.length })),
      'weapon',
    );
    this.checkList(body.passiveItems, passiveItems, 'passive item');

    if (startWeaponId && !body.weapons.some((w) => w.id === startWeaponId)) {
      throw new BadRequestException('Starting weapon is missing');
    }
  }

  private checkList(
    items: RunItemDto[],
    catalog: { id: string; maxLevel: number }[],
    label: string,
  ) {
    const maxLevels = new Map(catalog.map((c) => [c.id, c.maxLevel]));
    const seen = new Set<string>();

    for (const item of items) {
      const maxLevel = maxLevels.get(item.id);

      if (maxLevel === undefined) {
        throw new BadRequestException(`Unknown ${label}: ${item.id}`);
      }

      if (item.level > maxLevel) {
        throw new BadRequestException(`Invalid ${label} level: ${item.id}`);
      }

      if (seen.has(item.id)) {
        throw new BadRequestException(`Repeated ${label}: ${item.id}`);
      }

      seen.add(item.id);
    }
  }

  private toSummary(run: Run) {
    return {
      id: run.id,
      characterId: run.characterId,
      status: run.status,
      score: run.score,
      kills: run.kills,
      levelReached: run.levelReached,
      survivedTime: run.survivedTime,
      coinsEarned: run.coinsEarned,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
    };
  }
}
