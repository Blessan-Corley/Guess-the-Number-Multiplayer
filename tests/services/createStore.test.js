describe('createStore production safety', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.NODE_ENV = originalEnv;
  });

  test('falls back to memory outside production when redis is unavailable', async () => {
    process.env.NODE_ENV = 'development';

    jest.doMock('../../config/config', () => ({
      STORE_MODE: 'redis',
      NODE_ENV: 'development',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      REDIS_OPERATION_RETRY_ATTEMPTS: 3,
      REDIS_OPERATION_RETRY_BASE_MS: 120,
      REDIS_KEY_PREFIX: 'test:',
      SESSION_TTL_SECONDS: 3600,
    }));

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../src/lib/logger', () => mockLogger);
    jest.doMock('ioredis', () => {
      return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      }));
    });
    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn(),
    }));

    const createStore = require('../../src/storage/createStore');

    const store = await createStore();

    expect(store.constructor.name).toBe('MemoryStore');
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  test('fails fast in production when redis is unavailable', async () => {
    process.env.NODE_ENV = 'production';

    jest.doMock('../../config/config', () => ({
      STORE_MODE: 'redis',
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      REDIS_URL: 'redis://localhost:6379',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: '',
      REDIS_OPERATION_RETRY_ATTEMPTS: 3,
      REDIS_OPERATION_RETRY_BASE_MS: 120,
      REDIS_KEY_PREFIX: 'test:',
      SESSION_TTL_SECONDS: 3600,
    }));

    const mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../src/lib/logger', () => mockLogger);
    jest.doMock('ioredis', () => {
      return jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockRejectedValue(new Error('redis unavailable')),
      }));
    });
    jest.doMock('@upstash/redis', () => ({
      Redis: jest.fn(),
    }));

    const createStore = require('../../src/storage/createStore');

    await expect(createStore()).rejects.toThrow('redis unavailable');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
