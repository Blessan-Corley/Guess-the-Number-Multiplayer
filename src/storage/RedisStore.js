const GameStore = require('./GameStore');
const Party = require('../models/Party');
const config = require('../../config/config');
const logger = require('../lib/logger');

class RedisStore extends GameStore {
  constructor(redisClient) {
    super();
    this.client = redisClient;
    this.PREFIX = config.REDIS_KEY_PREFIX;
    this.TTL = config.SESSION_TTL_SECONDS;
    this.PARTY_INDEX_KEY = `${this.PREFIX}parties`;
    this.indexedParties = new Set();
    this.retryAttempts = Math.max(1, Number(config.REDIS_OPERATION_RETRY_ATTEMPTS) || 3);
    this.retryBaseDelayMs = Math.max(50, Number(config.REDIS_OPERATION_RETRY_BASE_MS) || 120);
  }

  isRetryableRedisError(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('fetch failed') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('socket') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('temporarily unavailable') ||
      message.includes('rate limit')
    );
  }

  async waitForRetry(delayMs) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async withRetry(operationName, executor) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await executor();
      } catch (error) {
        lastError = error;
        const shouldRetry = this.isRetryableRedisError(error) && attempt < this.retryAttempts;
        if (!shouldRetry) {
          throw error;
        }

        const delayMs = this.retryBaseDelayMs * 2 ** (attempt - 1);
        logger.warn(
          {
            operation: operationName,
            attempt,
            retryAttempts: this.retryAttempts,
            delayMs,
            error: error.message,
          },
          'Redis operation failed, retrying'
        );
        await this.waitForRetry(delayMs);
      }
    }

    throw lastError;
  }

  async saveParty(party) {
    const key = `${this.PREFIX}party:${party.code}`;
    const data = JSON.stringify(party.toJSON());

    if (this.indexedParties.has(party.code)) {
      await this.withRetry('saveParty:set', () => this.client.set(key, data, { EX: this.TTL }));
      return;
    }

    await this.withRetry('saveParty:set+index', () =>
      Promise.all([
        this.client.set(key, data, { EX: this.TTL }),
        this.client.sadd(this.PARTY_INDEX_KEY, party.code),
      ])
    );
    this.indexedParties.add(party.code);
  }

  async getParty(code) {
    const key = `${this.PREFIX}party:${code}`;
    const data = await this.withRetry('getParty:get', () => this.client.get(key));
    if (!data) return null;

    try {
      const json = typeof data === 'string' ? JSON.parse(data) : data;
      return Party.fromJSON(json);
    } catch (e) {
      logger.warn(
        { error: e.message, partyCode: code },
        'Failed to parse party from redis payload'
      );
      return null;
    }
  }

  async deleteParty(code) {
    const key = `${this.PREFIX}party:${code}`;
    await this.withRetry('deleteParty:delete+index', () =>
      Promise.all([this.client.del(key), this.client.srem(this.PARTY_INDEX_KEY, code)])
    );
    this.indexedParties.delete(code);
  }

  async hasParty(code) {
    const key = `${this.PREFIX}party:${code}`;
    const result = await this.withRetry('hasParty:exists', () => this.client.exists(key));
    return Number(result) > 0;
  }

  async getAllParties() {
    let partyCodes = [];
    if (typeof this.client.smembers === 'function') {
      partyCodes = await this.withRetry('getAllParties:smembers', () =>
        this.client.smembers(this.PARTY_INDEX_KEY)
      );
    } else if (typeof this.client.keys === 'function') {
      const keys = await this.withRetry('getAllParties:keys', () =>
        this.client.keys(`${this.PREFIX}party:*`)
      );
      partyCodes = keys.map((key) => key.replace(`${this.PREFIX}party:`, ''));
    }

    if (partyCodes.length === 0) return [];

    // Use MGET to fetch all party payloads in a single round-trip instead of
    // issuing one GET per party code.
    const redisKeys = partyCodes.map((code) => `${this.PREFIX}party:${code}`);
    const rawValues = await this.withRetry('getAllParties:mget', () =>
      this.client.mget(...redisKeys)
    );

    const parties = [];
    const staleCodes = [];

    for (let i = 0; i < partyCodes.length; i++) {
      const raw = rawValues[i];
      if (!raw) {
        staleCodes.push(partyCodes[i]);
        continue;
      }

      try {
        const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
        parties.push(Party.fromJSON(json));
      } catch (e) {
        logger.warn(
          { error: e.message, partyCode: partyCodes[i] },
          'Failed to parse party from redis payload'
        );
        staleCodes.push(partyCodes[i]);
      }
    }

    // Clean up stale index entries without blocking the return value.
    if (staleCodes.length > 0) {
      this.withRetry('getAllParties:cleanupIndex', () =>
        this.client.srem(this.PARTY_INDEX_KEY, ...staleCodes)
      ).catch((err) =>
        logger.warn({ error: err.message }, 'Failed to remove stale party index entries')
      );
    }

    return parties;
  }

  async getPartyCount() {
    if (typeof this.client.scard === 'function') {
      return Number(
        await this.withRetry('getPartyCount:scard', () => this.client.scard(this.PARTY_INDEX_KEY))
      );
    }

    const keys = await this.withRetry('getPartyCount:keys', () =>
      this.client.keys(`${this.PREFIX}party:*`)
    );
    return keys.length;
  }

  async mapPlayerToParty(playerId, partyCode) {
    const key = `${this.PREFIX}player:${playerId}`;
    await this.withRetry('mapPlayerToParty:set', () =>
      this.client.set(key, partyCode, { EX: this.TTL })
    );
  }

  async getPartyCodeForPlayer(playerId) {
    const key = `${this.PREFIX}player:${playerId}`;
    return await this.withRetry('getPartyCodeForPlayer:get', () => this.client.get(key));
  }

  async removePlayerMapping(playerId) {
    const key = `${this.PREFIX}player:${playerId}`;
    await this.withRetry('removePlayerMapping:del', () => this.client.del(key));
  }

  async mapSocketToPlayer(socketId, playerId) {
    const key = `${this.PREFIX}socket:${socketId}`;
    await this.withRetry('mapSocketToPlayer:set', () =>
      this.client.set(key, playerId, { EX: this.TTL })
    );
  }

  async getPlayerIdForSocket(socketId) {
    const key = `${this.PREFIX}socket:${socketId}`;
    return await this.withRetry('getPlayerIdForSocket:get', () => this.client.get(key));
  }

  async removeSocketMapping(socketId) {
    const key = `${this.PREFIX}socket:${socketId}`;
    await this.withRetry('removeSocketMapping:del', () => this.client.del(key));
  }

  async healthCheck() {
    try {
      if (typeof this.client.ping === 'function') {
        await this.withRetry('healthCheck:ping', () => this.client.ping());
      } else {
        await this.withRetry('healthCheck:set', () =>
          this.client.set(`${this.PREFIX}healthcheck`, 'ok', { ex: 5 })
        );
      }

      return {
        healthy: true,
        provider: 'redis',
      };
    } catch (error) {
      return {
        healthy: false,
        provider: 'redis',
        error: error.message,
      };
    }
  }

  async close() {
    if (typeof this.client.quit === 'function') {
      await this.client.quit();
      return;
    }

    if (typeof this.client.disconnect === 'function') {
      await this.client.disconnect();
    }
  }
}

module.exports = RedisStore;
