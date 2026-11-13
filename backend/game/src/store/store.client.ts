import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type StoreCharacter = {
  id: string;
  initialWeaponId: string;
};

@Injectable()
export class StoreClient {
  private static readonly TIMEOUT_MS = 2000;

  constructor(private readonly jwtService: JwtService) {}

  isConfigured() {
    return Boolean(process.env.STORE_API_URL);
  }

  async listOwnedCharacters(userId: string, email: string) {
    const token = await this.jwtService.signAsync({ sub: userId, email });

    const response = await fetch(
      `${process.env.STORE_API_URL}/api/store/me/characters`,
      {
        headers: { Cookie: `access_token=${token}` },
        signal: AbortSignal.timeout(StoreClient.TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Store answered ${response.status} when listing the characters`,
      );
    }

    return (await response.json()) as StoreCharacter[];
  }

  async creditCoins(userId: string, amount: number) {
    const response = await fetch(
      `${process.env.STORE_API_URL}/api/store/internal/wallets/${userId}/credit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY ?? '',
        },
        body: JSON.stringify({ amount }),
        signal: AbortSignal.timeout(StoreClient.TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      throw new Error(`Store answered ${response.status} when crediting coins`);
    }
  }
}
