import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type JwtPayload = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractTokenFromCookie(request.headers.cookie);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private extractTokenFromCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) {
      return null;
    }

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());

    const accessTokenCookie = cookies.find((cookie) =>
      cookie.startsWith('access_token='),
    );

    if (!accessTokenCookie) {
      return null;
    }

    return decodeURIComponent(accessTokenCookie.split('=')[1]);
  }
}
