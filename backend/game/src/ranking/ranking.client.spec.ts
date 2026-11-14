import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { JwtService } from '@nestjs/jwt';
import { RankingClient, RankingRun } from './ranking.client';

describe('RankingClient', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.RANKING_API_URL;

  const signAsync = mock(() => Promise.resolve('signed-token'));
  const jwtService = { signAsync } as unknown as JwtService;

  const run: RankingRun = {
    runId: 'run-1',
    characterId: 'ana-laura',
    won: false,
    score: 1200,
    enemiesKilled: 40,
    survivedTime: 300,
    coinsCollected: 12,
    weapons: [{ id: 'compiler', level: 3 }],
    passiveItems: [],
  };

  let client: RankingClient;

  function stubFetch(status = 201) {
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
    process.env.RANKING_API_URL = 'http://ranking.test:3002';
    client = new RankingClient(jwtService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalUrl === undefined) delete process.env.RANKING_API_URL;
    else process.env.RANKING_API_URL = originalUrl;
  });

  it('is configured only when the ranking url is set', () => {
    expect(client.isConfigured()).toBe(true);

    delete process.env.RANKING_API_URL;

    expect(client.isConfigured()).toBe(false);
  });

  it('records a run with a service token for the owner of the run', async () => {
    const fetchMock = stubFetch();

    await client.recordRun('user-1', run);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe('http://ranking.test:3002/api/ranking/me/runs');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Cookie: 'access_token=signed-token',
    });
    expect(signAsync).toHaveBeenCalledWith({ sub: 'user-1', svc: 'game' });
    expect(init.body).toBe(JSON.stringify(run));
  });

  it('fails when the ranking does not answer with success', async () => {
    stubFetch(409);

    await expect(client.recordRun('user-1', run)).rejects.toThrow(
      'Ranking answered 409',
    );
  });
});
