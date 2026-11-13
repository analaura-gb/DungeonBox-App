import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { RankingClient, RankingRun } from './ranking.client';

describe('RankingClient', () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.RANKING_API_URL;
  const originalKey = process.env.INTERNAL_API_KEY;

  const run: RankingRun = {
    runId: 'run-1',
    userId: 'user-1',
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
    process.env.INTERNAL_API_KEY = 'secret-key';
    client = new RankingClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;

    if (originalUrl === undefined) delete process.env.RANKING_API_URL;
    else process.env.RANKING_API_URL = originalUrl;

    if (originalKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = originalKey;
  });

  it('is configured only when the ranking url is set', () => {
    expect(client.isConfigured()).toBe(true);

    delete process.env.RANKING_API_URL;

    expect(client.isConfigured()).toBe(false);
  });

  it('records a run with the internal key', async () => {
    const fetchMock = stubFetch();

    await client.recordRun(run);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toBe('http://ranking.test:3002/api/ranking/runs');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-internal-key': 'secret-key',
    });
    expect(init.body).toBe(JSON.stringify(run));
  });

  it('fails when the ranking does not answer with success', async () => {
    stubFetch(409);

    await expect(client.recordRun(run)).rejects.toThrow('Ranking answered 409');
  });
});
