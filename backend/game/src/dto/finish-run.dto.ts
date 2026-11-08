import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class RunItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsInt()
  @Min(1)
  level: number;
}

export class FinishRunDto {
  @IsBoolean()
  won: boolean;

  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(0)
  kills: number;

  @IsInt()
  @Min(1)
  levelReached: number;

  @IsInt()
  @Min(0)
  @Max(600)
  survivedTime: number;

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => RunItemDto)
  weapons: RunItemDto[];

  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => RunItemDto)
  passiveItems: RunItemDto[];
}
