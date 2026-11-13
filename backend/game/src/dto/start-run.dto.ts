import { IsNotEmpty, IsString } from 'class-validator';

export class StartRunDto {
  @IsString()
  @IsNotEmpty()
  characterId: string;
}
