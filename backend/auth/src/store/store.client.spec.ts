import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import { StoreClient } from './store.client';

describe('StoreClient', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.STORE_API_URL;

  const jwtService = {
    signAsync: mock(() => Promise.resolve('signed-token')),
  } as unknown as JwtService;

  let client: StoreClient;

  function stubFetch(status = 200) {
    const fetchMock = mock(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
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

  it('posts to the wallet route of the configured store', async () => {
    const fetchMock = stubFetch();

    await client.createWallet('user-1', 'player@email.com');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe('http://store.test:3001/api/store/me/wallet');
    expect(init.method).toBe('POST');
  });

  it('carries the session as a cookie, because that is what the store reads', async () => {
    const fetchMock = stubFetch();

    await client.createWallet('user-1', 'player@email.com');

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect((init.headers as Record<string, string>).Cookie).toBe(
      'access_token=signed-token',
    );
  });

  it('never sends the user id in the body', async () => {
    const fetchMock = stubFetch();

    await client.createWallet('user-1', 'player@email.com');

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(init.body).toBeUndefined();
  });

  it('gives up instead of hanging when the store does not answer', async () => {
    const fetchMock = stubFetch();

    await client.createWallet('user-1', 'player@email.com');

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('fails when the store refuses the call', async () => {
    stubFetch(500);

    await expect(
      client.createWallet('user-1', 'player@email.com'),
    ).rejects.toThrow('Store answered 500');
  });

  it('fails when the store address is not configured', async () => {
    delete process.env.STORE_API_URL;

    const fetchMock = stubFetch();

    await expect(
      client.createWallet('user-1', 'player@email.com'),
    ).rejects.toThrow('STORE_API_URL is not set');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
