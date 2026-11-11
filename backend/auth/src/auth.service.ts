import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UsersRepository } from './users/users.repository';
import { StoreClient } from './store/store.client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly storeClient: StoreClient,
  ) {}

  async register(data: RegisterDto) {
    const userAlreadyExists = await this.usersRepository.findByEmail(
      data.email,
    );

    if (userAlreadyExists) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await Bun.password.hash(data.password);
    const securityCode = this.generateSecurityCode();

    const securityCodeHash = await Bun.password.hash(securityCode);

    const user = await this.usersRepository.create({
      name: data.name,
      email: data.email,
      passwordHash,
      securityCodeHash,
    });

    try {
      await this.storeClient.createWallet(user.id, user.email);
    } catch (error) {
      this.logger.warn(
        `Could not create the wallet for ${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      message: 'User registered successfully',
      securityCode,
    };
  }

  async login(data: LoginDto) {
    const user = await this.usersRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Email not found');
    }

    const passwordMatches = await Bun.password.verify(
      data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Incorrect password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      message: 'User logged in successfully',
      accessToken,
    };
  }

  async getAuthenticatedUser(userId: string) {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }

  async resetPassword(data: ResetPasswordDto) {
    const user = await this.usersRepository.findByEmail(data.email);

    if (!user) {
      throw new UnauthorizedException('Email not found');
    }

    const securityCodeMatches = await Bun.password.verify(
      data.securityCode,
      user.securityCodeHash,
    );

    if (!securityCodeMatches) {
      throw new UnauthorizedException('Invalid security code');
    }

    const passwordHash = await Bun.password.hash(data.newPassword);

    await this.usersRepository.updatePassword(user.id, passwordHash);

    return {
      message: 'Password reset successfully',
    };
  }

  private generateSecurityCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    function generateBlock(length: number) {
      let block = '';

      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        block += characters[randomIndex];
      }

      return block;
    }

    return `DGBX-${generateBlock(4)}-${generateBlock(4)}-${generateBlock(4)}`;
  }
}
