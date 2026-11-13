import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const expected = process.env.INTERNAL_API_KEY;

    if (!expected || request.headers['x-internal-key'] !== expected) {
      throw new UnauthorizedException('Invalid internal key');
    }

    return true;
  }
}
