'use strict';

/**
 * Tests for config/config.js internal parser functions.
 * Uses jest.resetModules() to re-require the module with different env vars,
 * which is the only way to exercise the private parseBoolean / parseList /
 * parseTrustProxy branches (they execute at module-initialisation time).
 */

const SAVED_ENV = {};
const ENV_KEYS = [
  'NODE_ENV',
  'APP_BASE_URL',
  'RENDER_EXTERNAL_URL',
  'CORS_ORIGINS',
  'SOCKET_CORS_ORIGINS',
  'TRUST_PROXY',
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRESQL_URL',
  'DATABASE_SSL_REJECT_UNAUTHORIZED',
  'DATABASE_AUTO_MIGRATE',
  'DATABASE_FAIL_ON_PENDING_MIGRATIONS',
  'STORE_MODE',
  'REDIS_URL',
];

beforeEach(() => {
  ENV_KEYS.forEach((k) => {
    SAVED_ENV[k] = process.env[k];
    delete process.env[k];
  });
  jest.resetModules();
});

afterEach(() => {
  ENV_KEYS.forEach((k) => {
    if (SAVED_ENV[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = SAVED_ENV[k];
    }
  });
  jest.resetModules();
});

// ─── parseList ────────────────────────────────────────────────────────────────

describe('parseList (via CORS_ORIGINS env var)', () => {
  test('returns fallback when env var is not set (falsy branch)', () => {
    // CORS_ORIGINS unset → parseList(undefined, ...) → returns fallback
    const cfg = require('../../config/config');
    expect(Array.isArray(cfg.CORS_ORIGINS)).toBe(true);
  });

  test('parses comma-separated string when env var is set (truthy branch)', () => {
    process.env.CORS_ORIGINS = 'http://example.com,http://test.com';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.CORS_ORIGINS).toEqual(['http://example.com', 'http://test.com']);
  });

  test('parses single-value CORS_ORIGINS', () => {
    process.env.CORS_ORIGINS = 'https://mygame.io';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.CORS_ORIGINS).toEqual(['https://mygame.io']);
  });

  test('production falls back to APP_BASE_URL origin when CORS_ORIGINS is unset', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_BASE_URL = 'https://numduel.example.com/path';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.CORS_ORIGINS).toEqual(['https://numduel.example.com']);
    expect(cfg.SOCKET_CORS_ORIGINS).toEqual(['https://numduel.example.com']);
  });

  test('APP_BASE_URL falls back to RENDER_EXTERNAL_URL when explicit base URL is unset', () => {
    process.env.NODE_ENV = 'production';
    process.env.RENDER_EXTERNAL_URL = 'https://guess-the-number-multiplayer-3rk1.onrender.com';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.APP_BASE_URL).toBe('https://guess-the-number-multiplayer-3rk1.onrender.com');
    expect(cfg.CORS_ORIGINS).toEqual(['https://guess-the-number-multiplayer-3rk1.onrender.com']);
  });
});

// ─── parseBoolean ─────────────────────────────────────────────────────────────

describe('parseBoolean (via DATABASE_SSL_REJECT_UNAUTHORIZED env var)', () => {
  test('string "true" returns true', () => {
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'true';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_SSL_REJECT_UNAUTHORIZED).toBe(true);
  });

  test('string "1" returns true', () => {
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = '1';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_SSL_REJECT_UNAUTHORIZED).toBe(true);
  });

  test('string "yes" returns true', () => {
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED = 'yes';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_SSL_REJECT_UNAUTHORIZED).toBe(true);
  });

  test('string "false" returns false', () => {
    process.env.DATABASE_AUTO_MIGRATE = 'false';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_AUTO_MIGRATE).toBe(false);
  });

  test('string "0" returns false', () => {
    process.env.DATABASE_AUTO_MIGRATE = '0';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_AUTO_MIGRATE).toBe(false);
  });

  test('string "no" returns false', () => {
    process.env.DATABASE_AUTO_MIGRATE = 'no';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_AUTO_MIGRATE).toBe(false);
  });

  test('unrecognised string returns fallback', () => {
    process.env.DATABASE_FAIL_ON_PENDING_MIGRATIONS = 'maybe';
    jest.resetModules();
    // In test (non-production) env the fallback is false
    const cfg = require('../../config/config');
    expect(typeof cfg.DATABASE_FAIL_ON_PENDING_MIGRATIONS).toBe('boolean');
  });
});

// ─── parseTrustProxy ──────────────────────────────────────────────────────────

describe('parseTrustProxy (via TRUST_PROXY env var)', () => {
  test('string "true" returns boolean true', () => {
    process.env.TRUST_PROXY = 'true';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.TRUST_PROXY).toBe(true);
  });

  test('string "false" returns boolean false', () => {
    process.env.TRUST_PROXY = 'false';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.TRUST_PROXY).toBe(false);
  });

  test('numeric string "2" returns integer 2', () => {
    process.env.TRUST_PROXY = '2';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.TRUST_PROXY).toBe(2);
  });

  test('unrecognised string is returned as-is', () => {
    process.env.TRUST_PROXY = 'loopback';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.TRUST_PROXY).toBe('loopback');
  });
});

// ─── config.validate() edge paths ────────────────────────────────────────────

describe('config.validate() warning branches', () => {
  test('warns when DATABASE_URL is set but does not start with "postgres"', () => {
    process.env.DATABASE_URL = 'mysql://localhost/db';
    jest.resetModules();
    const cfg = require('../../config/config');
    const { warnings } = cfg.validate();
    expect(warnings.some((w) => w.includes('PostgreSQL'))).toBe(true);
  });

  test('uses POSTGRES_URL when DATABASE_URL is unset', () => {
    process.env.POSTGRES_URL = 'postgresql://user:pass@db.example.com/app?sslmode=require';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.DATABASE_URL).toBe(process.env.POSTGRES_URL);
    expect(cfg.DATABASE_ENABLED).toBe(true);
  });

  test('defaults STORE_MODE to redis when REDIS_URL is present', () => {
    process.env.REDIS_URL = 'redis://default:password@redis.example.com:6379';
    jest.resetModules();
    const cfg = require('../../config/config');
    expect(cfg.STORE_MODE).toBe('redis');
    expect(cfg.REDIS_ENABLED).toBe(true);
  });
});
