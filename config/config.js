const sharedConfig = require('./shared');

const parseList = (value, fallback = []) => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return fallback;
};

const parseTrustProxy = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return value;
};

const firstNonEmpty = (...values) =>
  values.find((value) => value !== undefined && value !== null && String(value).trim() !== '') ||
  '';

const toOrigin = (value) => {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const resolvedAppBaseUrl =
  firstNonEmpty(process.env.APP_BASE_URL, process.env.RENDER_EXTERNAL_URL) ||
  `http://localhost:${parseInteger(process.env.PORT, 3000)}`;
const resolvedAppOrigin = toOrigin(resolvedAppBaseUrl);
const resolvedDatabaseUrl = firstNonEmpty(
  process.env.DATABASE_URL,
  process.env.POSTGRES_URL,
  process.env.POSTGRESQL_URL
);
const hasRedisConfig = Boolean(
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    process.env.REDIS_URL
);
const defaultStoreMode = process.env.STORE_MODE || (hasRedisConfig ? 'redis' : 'memory');

const config = {
  ...sharedConfig,

  PORT: parseInteger(process.env.PORT, 3000),
  NODE_ENV: nodeEnv,
  APP_BASE_URL: resolvedAppBaseUrl,

  PARTY_CODE_LENGTH: 6,
  MAX_PLAYERS_PER_PARTY: 2,
  SELECTION_TIME_LIMIT: 30,
  INACTIVITY_TIMEOUT: 10 * 60 * 1000,
  CLEANUP_INTERVAL: parseInteger(process.env.CLEANUP_INTERVAL, 5 * 60 * 1000),
  RECONNECT_GRACE_PERIOD_MS: parseInteger(process.env.RECONNECT_GRACE_PERIOD_MS, 120000),

  SOCKET_TIMEOUT: 60000,
  PING_INTERVAL: 25000,
  PING_TIMEOUT: 60000,

  MAX_PARTIES_PER_IP: 5,
  PARTY_CREATION_COOLDOWN: 30000,

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOAD_TEST_DEBUG_LOGS: parseBoolean(process.env.LOAD_TEST_DEBUG_LOGS, false),
  ENABLE_DEBUG: nodeEnv === 'development',
  TRUST_PROXY: parseTrustProxy(process.env.TRUST_PROXY, isProduction ? 1 : false),

  CORS_ORIGINS: parseList(
    process.env.CORS_ORIGINS,
    isProduction ? (resolvedAppOrigin ? [resolvedAppOrigin] : []) : ['*']
  ),
  SOCKET_CORS_ORIGINS: parseList(
    process.env.SOCKET_CORS_ORIGINS || process.env.CORS_ORIGINS,
    isProduction ? (resolvedAppOrigin ? [resolvedAppOrigin] : []) : ['*']
  ),

  ENABLE_COMPRESSION: true,
  ENABLE_CACHING: true,
  CACHE_DURATION: 3600,

  STORE_MODE: defaultStoreMode,
  SESSION_TTL_SECONDS: parseInteger(process.env.SESSION_TTL_SECONDS, 3600),
  REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || `number-guesser:${nodeEnv}:`,
  REDIS_OPERATION_RETRY_ATTEMPTS: parseInteger(process.env.REDIS_OPERATION_RETRY_ATTEMPTS, 3),
  REDIS_OPERATION_RETRY_BASE_MS: parseInteger(process.env.REDIS_OPERATION_RETRY_BASE_MS, 120),
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInteger(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || '',

  DATABASE_URL: resolvedDatabaseUrl,
  DATABASE_POOL_MAX: parseInteger(process.env.DATABASE_POOL_MAX, 10),
  DATABASE_SSL_REJECT_UNAUTHORIZED: parseBoolean(
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED,
    true
  ),
  DATABASE_AUTO_MIGRATE: parseBoolean(process.env.DATABASE_AUTO_MIGRATE, nodeEnv !== 'production'),
  DATABASE_FAIL_ON_PENDING_MIGRATIONS: parseBoolean(
    process.env.DATABASE_FAIL_ON_PENDING_MIGRATIONS,
    nodeEnv === 'production'
  ),
  PROFILE_MATCH_HISTORY_LIMIT: parseInteger(process.env.PROFILE_MATCH_HISTORY_LIMIT, 20),
  LEADERBOARD_LIMIT: parseInteger(process.env.LEADERBOARD_LIMIT, 20),

  RATE_LIMIT_WINDOW_MS: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: parseInteger(process.env.RATE_LIMIT_MAX, 100),

  APP_VERSION: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
  COMMIT_SHA: process.env.COMMIT_SHA || 'local',

  DEV_OPTIONS: {
    AUTO_FILL_PLAYERS: nodeEnv === 'development',
    REDUCED_TIMERS: nodeEnv === 'development',
    VERBOSE_LOGGING: nodeEnv === 'development',
  },
};

config.REDIS_ENABLED = config.STORE_MODE === 'redis';
config.DATABASE_ENABLED = Boolean(config.DATABASE_URL);

config.validate = () => {
  const errors = [];
  const warnings = [];

  if (
    config.REDIS_ENABLED &&
    !(
      (config.UPSTASH_REDIS_REST_URL && config.UPSTASH_REDIS_REST_TOKEN) ||
      config.REDIS_URL ||
      config.REDIS_HOST
    )
  ) {
    errors.push('STORE_MODE=redis requires Upstash credentials or Redis connection details.');
  }

  if (isProduction && config.CORS_ORIGINS.length === 0) {
    warnings.push('CORS_ORIGINS is empty in production. Requests may be blocked.');
  }

  if (config.DATABASE_ENABLED && !config.DATABASE_URL.startsWith('postgres')) {
    warnings.push('DATABASE_URL is set but does not look like a PostgreSQL connection string.');
  }

  return { errors, warnings };
};

module.exports = config;
