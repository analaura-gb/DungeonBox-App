import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StoreClient {
  private static readonly TIMEOUT_MS = 2000;

  constructor(private readonly jwtService: JwtService) {}

  async createWallet(userId: string, email: string) {
    const baseUrl = process.env.STORE_API_URL;

    if (!baseUrl) {
      throw new Error('STORE_API_URL is not set');
    }

    const token = await this.jwtService.signAsync({ sub: userId, email });

    const response = await fetch(`${baseUrl}/api/store/me/wallet`, {
      method: 'POST',
      headers: { Cookie: `access_token=${token}` },
      signal: AbortSignal.timeout(StoreClient.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Store answered ${response.status} when creating the wallet`,
      );
    }
  }
}
