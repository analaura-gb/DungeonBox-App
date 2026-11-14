import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import { StoreClient } from './store.client';

describe('StoreClient', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.STORE_API_URL;

  const signAsync = mock(() => Promise.resolve('signed-token'));
  const jwtService = { signAsync } as unknown as JwtService;

  let client: StoreClient;

  function stubFetch(status = 200, body: unknown = []) {
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
      } as Response),
    );

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    return fetchMock;
  }

  beforeEach(() => {
    process.env.STORE_API_URL = 'http://store.test:3001';
    client = new StoreClient(jwtService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalUrl === undefined) {
      delete process.env.STORE_API_URL;
      return;
    }

    process.env.STORE_API_URL = originalUrl;
  });

  it('is configured only when the store url is set', () => {
    expect(client.isConfigured()).toBe(true);

    delete process.env.STORE_API_URL;

    expect(client.isConfigured()).toBe(false);
  });

  it('lists the characters the user owns, signed in as that user', async () => {
    const fetchMock = stubFetch(200, [
      { id: 'ana-laura', initialWeaponId: 'compiler' },
    ]);

    const characters = await client.listOwnedCharacters(
      'user-1',
      'player@email.com',
    );

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe('http://store.test:3001/api/store/me/characters');
    expect(init.headers).toEqual({ Cookie: 'access_token=signed-token' });
    expect(signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'player@email.com',
    });
    expect(characters).toEqual([
      { id: 'ana-laura', initialWeaponId: 'compiler' },
    ]);
  });

  it('credits coins with a service token for the owner of the run', async () => {
    const fetchMock = stubFetch(200, { coins: 42 });

    await client.creditCoins('user-1', 12);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe('http://store.test:3001/api/store/me/wallet/credit');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Cookie: 'access_token=signed-token',
    });
    expect(signAsync).toHaveBeenCalledWith({ sub: 'user-1', svc: 'game' });
    expect(init.body).toBe(JSON.stringify({ amount: 12 }));
  });

  it('fails when the store does not answer with success', async () => {
    stubFetch(503);

    await expect(
      client.listOwnedCharacters('user-1', 'player@email.com'),
    ).rejects.toThrow('Store answered 503');
  });
});
