const RedisStore = require('../../src/storage/RedisStore');

describe('RedisStore resilience', () => {
  function createStoreWithClient(clientOverrides = {}) {
    const client = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      srem: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      scard: jest.fn().mockResolvedValue(0),
      ping: jest.fn().mockResolvedValue('PONG'),
      ...clientOverrides,
    };

    const store = new RedisStore(client);
    store.retryBaseDelayMs = 1;
    jest.spyOn(store, 'waitForRetry').mockResolvedValue(undefined);
    return { store, client };
  }

  test('retries transient redis errors and succeeds', async () => {
    const { store, client } = createStoreWithClient({
      exists: jest.fn().mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValueOnce(1),
    });

    await expect(store.hasParty('ABC123')).resolves.toBe(true);
    expect(client.exists).toHaveBeenCalledTimes(2);
  });

  test('does not retry non-transient redis errors', async () => {
    const { store, client } = createStoreWithClient({
      exists: jest.fn().mockRejectedValue(new Error('WRONGTYPE Operation against a key')),
    });

    await expect(store.hasParty('ABC123')).rejects.toThrow('WRONGTYPE');
    expect(client.exists).toHaveBeenCalledTimes(1);
  });

  test('fails after max retry attempts for repeated transient errors', async () => {
    const { store, client } = createStoreWithClient({
      exists: jest.fn().mockRejectedValue(new Error('fetch failed')),
    });
    store.retryAttempts = 2;

    await expect(store.hasParty('ABC123')).rejects.toThrow('fetch failed');
    expect(client.exists).toHaveBeenCalledTimes(2);
    expect(store.waitForRetry).toHaveBeenCalledTimes(1);
  });
});
