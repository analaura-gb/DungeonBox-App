import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

// a finished run, sent by the game service
export class RecordRunDto {
  @IsUUID()
  runId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  characterId: string;

  @IsBoolean()
  won: boolean;

  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(0)
  enemiesKilled: number;

  // seconds
  @IsInt()
  @Min(0)
  survivedTime: number;

  @IsInt()
  @Min(0)
  coinsCollected: number;
}
