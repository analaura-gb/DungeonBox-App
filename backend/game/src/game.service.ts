import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Run, RunStatus } from '../generated/prisma/client';
import { FinishRunDto, RunItemDto } from './dto/finish-run.dto';
import { StartRunDto } from './dto/start-run.dto';
import { RunsRepository } from './runs/runs.repository';
import { CatalogRepository } from './catalog/catalog.repository';

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

  async startRun(userId: string, { characterId }: StartRunDto) {
    const character = await this.runsRepository.findCharacter(characterId);

    if (!character) {
      throw new BadRequestException('Unknown character');
    }

    const run = await this.runsRepository.create(userId, characterId);

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

    await this.checkItems(body, run.character.startWeaponId);

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

    this.sendToRanking(finished);

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

  private sendToRanking(run: Run) {
    const rankingUrl = process.env.RANKING_API_URL;

    if (!rankingUrl) return;

    fetch(`${rankingUrl}/api/ranking/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
      },
      body: JSON.stringify({
        runId: run.id,
        userId: run.userId,
        characterId: run.characterId,
        won: run.status === RunStatus.WON,
        score: run.score,
        enemiesKilled: run.kills,
        survivedTime: run.survivedTime,
        coinsCollected: run.coinsEarned,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
      })
      .catch((error: Error) => {
        this.logger.warn(
          `Could not send run ${run.id} to the ranking: ${error.message}`,
        );
      });
  }

  private async checkItems(body: FinishRunDto, startWeaponId: string) {
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

    if (!body.weapons.some((w) => w.id === startWeaponId)) {
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
