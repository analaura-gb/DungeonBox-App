import { IsInt, Min } from 'class-validator';

export class CreditCoinsDto {
  @IsInt()
  @Min(1)
  amount: number;
}
