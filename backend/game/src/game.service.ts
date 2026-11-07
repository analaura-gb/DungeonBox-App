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

// same rules as the game frontend (frontend/game/src/game/content.ts)
const TIME_LIMIT_SECONDS = 10 * 60;
// clock difference allowed between the browser and the server
const TIME_TOLERANCE_SECONDS = 5;
// 1 coin for every 100 points
const SCORE_PER_COIN = 100;
// high scores listed per player
const HIGH_SCORES_LIMIT = 10;

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly runsRepository: RunsRepository) {}

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

    // the game clock can't run faster than the real one (pauses only make it slower)
    const elapsedSeconds = (Date.now() - run.startedAt.getTime()) / 1000;

    if (body.survivedTime > elapsedSeconds + TIME_TOLERANCE_SECONDS) {
      throw new BadRequestException('Survived time is longer than the run');
    }

    // a run is only won by surviving the whole semester
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

  // Sends the finished run to the ranking service (only when RANKING_API_URL is set).
  // The run is already saved here, so a ranking failure is only logged.
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

  // weapons / passive items must exist, be unique and within their max level
  private async checkItems(body: FinishRunDto, startWeaponId: string) {
    const [weapons, passiveItems] = await Promise.all([
      this.runsRepository.findWeapons(),
      this.runsRepository.findPassiveItems(),
    ]);

    this.checkList(body.weapons, weapons, 'weapon');
    this.checkList(body.passiveItems, passiveItems, 'passive item');

    // the starting weapon can't be dropped during a run
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
