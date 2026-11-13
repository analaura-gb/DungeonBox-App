import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { SERVICE_ONLY } from './service-only.decorator';

type JwtPayload = {
  sub: string;
  email?: string;
  // So os tokens que um backend assina para si carregam essa claim. O auth
  // emite apenas { sub, email }, entao ela separa "o game agindo por um
  // jogador" de "o jogador agindo por si".
  svc?: string;
  iat?: number;
  exp?: number;
};

export type AuthenticatedRequest = Request & {
  user: JwtPayload;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractTokenFromCookie(request.headers.cookie);

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }

    request.user = payload;

    if (this.isServiceOnly(context) && !payload.svc) {
      throw new ForbiddenException('Service token required');
    }

    return true;
  }

  private isServiceOnly(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(SERVICE_ONLY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
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
