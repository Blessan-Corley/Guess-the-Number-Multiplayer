const { Redis: UpstashRedis } = require('@upstash/redis');
const Redis = require('ioredis');
const config = require('../../config/config');
const logger = require('../lib/logger');
const MemoryStore = require('./MemoryStore');
const RedisStore = require('./RedisStore');

const createRedisClient = () => {
  if (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRedis({
      url: config.UPSTASH_REDIS_REST_URL,
      token: config.UPSTASH_REDIS_REST_TOKEN,
    });
  }

  if (config.REDIS_URL) {
    return new Redis(config.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });
  }

  return new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });
};

const createStore = async () => {
  if (config.STORE_MODE !== 'redis') {
    logger.info({ storeMode: 'memory' }, 'Using in-memory game store');
    return new MemoryStore();
  }

  try {
    const client = createRedisClient();

    if (typeof client.connect === 'function') {
      await client.connect();
    }

    if (typeof client.ping === 'function') {
      await client.ping();
    }

    logger.info({ storeMode: 'redis' }, 'Using Redis-backed game store');
    return new RedisStore(client);
  } catch (error) {
    if (config.NODE_ENV === 'production') {
      logger.error({ error: error.message }, 'Redis store bootstrap failed in production');
      throw error;
    }

    logger.warn({ error: error.message }, 'Falling back to in-memory game store');
    return new MemoryStore();
  }
};

module.exports = createStore;
