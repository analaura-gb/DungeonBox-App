import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @Matches(/^DGBX-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  securityCode: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}
