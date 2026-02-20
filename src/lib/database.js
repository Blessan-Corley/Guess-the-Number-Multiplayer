const { Pool } = require('pg');
const config = require('../../config/config');
const logger = require('./logger');
const { normalizeConnectionString, shouldEnableSsl } = require('./database/utils');
const { runMigrations } = require('./database/migrationRunner');
const {
  upsertGuestProfile,
  getProfileByGuestToken,
  getProfileById,
  getLeaderboard,
  getMatchHistoryForProfile,
} = require('./database/profileQueries');
const { recordCompletedMatch } = require('./database/matchQueries');

class Database {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.pool = null;
    this.enabled = Boolean(options.connectionString || config.DATABASE_URL);
    this.connectionString = normalizeConnectionString(
      options.connectionString || config.DATABASE_URL
    );
    this.poolFactory = options.poolFactory || ((poolConfig) => new Pool(poolConfig));
    this.migrationsDir = options.migrationsDir;
    this.autoMigrate = options.autoMigrate ?? config.DATABASE_AUTO_MIGRATE;
    this.failOnPendingMigrations =
      options.failOnPendingMigrations ?? config.DATABASE_FAIL_ON_PENDING_MIGRATIONS;
  }

  async connect() {
    if (!this.enabled || this.pool) {
      return this.pool;
    }

    try {
      const sslEnabled = shouldEnableSsl(this.connectionString);
      const poolConfig = {
        connectionString: this.connectionString,
        max: config.DATABASE_POOL_MAX,
      };

      if (sslEnabled) {
        poolConfig.ssl = { rejectUnauthorized: config.DATABASE_SSL_REJECT_UNAUTHORIZED };
      }

      this.pool = this.poolFactory(poolConfig);
      await this.pool.query('SELECT 1');
      await runMigrations({
        pool: this.pool,
        migrationsDir: this.migrationsDir,
        autoApply: this.autoMigrate,
        failOnPending: this.failOnPendingMigrations,
        logger: this.logger,
      });
      this.logger.info({ databaseEnabled: true }, 'Database connected');
      return this.pool;
    } catch (error) {
      if (this.pool) {
        await this.pool.end().catch(() => {});
        this.pool = null;
      }
      throw error;
    }
  }

  isReady() {
    return Boolean(this.pool);
  }

  disable() {
    this.enabled = false;
    if (this.pool) {
      this.pool.end().catch(() => {});
      this.pool = null;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async healthCheck() {
    if (!this.enabled) {
      return {
        enabled: false,
        healthy: true,
        message: 'Database disabled',
      };
    }

    try {
      await this.connect();
      await this.pool.query('SELECT 1');
      return {
        enabled: true,
        healthy: true,
      };
    } catch (error) {
      return {
        enabled: true,
        healthy: false,
        error: error.message,
      };
    }
  }

  async upsertGuestProfile(payload) {
    return upsertGuestProfile(this, payload);
  }

  async getProfileByGuestToken(guestToken, guestSessionSecret) {
    return getProfileByGuestToken(this, guestToken, guestSessionSecret);
  }

  async getProfileById(profileId) {
    return getProfileById(this, profileId);
  }

  async getLeaderboard(limit = config.LEADERBOARD_LIMIT) {
    return getLeaderboard(this, limit);
  }

  async getMatchHistoryForProfile(profileId, limit = config.PROFILE_MATCH_HISTORY_LIMIT) {
    return getMatchHistoryForProfile(this, profileId, limit);
  }

  async recordCompletedMatch(match) {
    return recordCompletedMatch(this, match);
  }
}

module.exports = Database;
