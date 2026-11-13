import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class BuildItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @Min(1)
  level: number;
}

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

  @IsInt()
  @Min(0)
  survivedTime: number;

  @IsInt()
  @Min(0)
  coinsCollected: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BuildItemDto)
  weapons?: BuildItemDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => BuildItemDto)
  passiveItems?: BuildItemDto[];
}
