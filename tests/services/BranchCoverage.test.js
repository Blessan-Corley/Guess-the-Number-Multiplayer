'use strict';

/**
 * Surgically targeted tests to cover the last few uncovered branches
 * identified in the coverage JSON (AppError, security, inputRules, etc.)
 */

const AppError = require('../../src/errors/AppError');
const { generateSecret, hashSecret, secretsMatch } = require('../../src/lib/security');
const { validateInput } = require('../../src/utils/validators/inputRules');
const PartyService = require('../../src/services/PartyService');

// ─── AppError ────────────────────────────────────────────────────────────────

describe('AppError', () => {
  test('constructs with default values', () => {
    const err = new AppError();
    expect(err.name).toBe('AppError');
    expect(err.statusCode).toBe(500);
    expect(err.details).toBeNull();
    expect(err.cause).toBeNull();
    expect(err instanceof Error).toBe(true);
  });

  test('constructs with all custom values', () => {
    const err = new AppError({
      code: 'CUSTOM_CODE',
      statusCode: 422,
      safeMessage: 'Unprocessable',
      details: { field: 'x' },
      cause: new Error('root cause'),
    });
    expect(err.code).toBe('CUSTOM_CODE');
    expect(err.statusCode).toBe(422);
    expect(err.safeMessage).toBe('Unprocessable');
    expect(err.details).toEqual({ field: 'x' });
    expect(err.cause).toBeDefined();
  });

  test('constructs with partial values (exercises default param branches)', () => {
    const err = new AppError({ statusCode: 404 });
    expect(err.statusCode).toBe(404);
    expect(err.details).toBeNull(); // default
    expect(err.cause).toBeNull(); // default
  });
});

// ─── security.js ──────────────────────────────────────────────────────────────

describe('security', () => {
  test('generateSecret returns 64-char hex string', () => {
    const s = generateSecret();
    expect(typeof s).toBe('string');
    expect(s).toHaveLength(64);
  });

  test('hashSecret produces deterministic sha256 hex', () => {
    const h1 = hashSecret('abc');
    const h2 = hashSecret('abc');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  test('hashSecret handles null/falsy input (exercises `|| ""` branch)', () => {
    expect(() => hashSecret(null)).not.toThrow();
    expect(() => hashSecret(undefined)).not.toThrow();
  });

  test('secretsMatch: false when secret is falsy', () => {
    expect(secretsMatch(null, hashSecret('x'))).toBe(false);
    expect(secretsMatch('', hashSecret('x'))).toBe(false);
  });

  test('secretsMatch: false when expectedHash is falsy', () => {
    expect(secretsMatch('mysecret', null)).toBe(false);
    expect(secretsMatch('mysecret', '')).toBe(false);
  });

  test('secretsMatch: false when hashes have different length', () => {
    // provide a hash of wrong length
    expect(secretsMatch('abc', 'tooshort')).toBe(false);
  });

  test('secretsMatch: true for matching secret and hash', () => {
    const secret = 'correct-secret';
    const hash = hashSecret(secret);
    expect(secretsMatch(secret, hash)).toBe(true);
  });

  test('secretsMatch: false for wrong secret', () => {
    const hash = hashSecret('correct-secret');
    expect(secretsMatch('wrong-secret', hash)).toBe(false);
  });
});

// ─── inputRules edge branches ─────────────────────────────────────────────────

describe('validateInput — edge branches', () => {
  test('undefined input with type check: skips type check (input is undefined)', () => {
    // input is undefined, rules.type is set — branch: `input !== null && input !== undefined` = false
    const r = validateInput(undefined, { type: 'string' });
    expect(r.valid).toBe(true); // no errors since required not set and type check is skipped
  });

  test('number with min defined but input >= min: no error (branch not entered)', () => {
    const r = validateInput(5, { min: 1 });
    expect(r.valid).toBe(true);
  });

  test('number with max defined but input <= max: no error (branch not entered)', () => {
    const r = validateInput(50, { max: 100 });
    expect(r.valid).toBe(true);
  });

  test('string with minLength defined but length >= minLength: no error', () => {
    const r = validateInput('hello', { minLength: 3 });
    expect(r.valid).toBe(true);
  });

  test('string with maxLength defined but length <= maxLength: no error', () => {
    const r = validateInput('hi', { maxLength: 10 });
    expect(r.valid).toBe(true);
  });

  test('string with pattern that matches: no error', () => {
    const r = validateInput('abc123', { pattern: /^[a-z0-9]+$/ });
    expect(r.valid).toBe(true);
  });

  test('integer rule: no error when input is already integer', () => {
    const r = validateInput(7, { integer: true });
    expect(r.valid).toBe(true);
  });
});

// ─── PartyService: publicDirectoryMethods branches ────────────────────────────

describe('PartyService publicDirectoryMethods', () => {
  let svc;

  beforeEach(() => {
    svc = new PartyService();
  });

  test('listPublicParties returns empty array when no parties exist', async () => {
    const result = await svc.listPublicParties();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test('getPublicLobbyStats returns zeros when no parties', async () => {
    const stats = await svc.getPublicLobbyStats();
    expect(stats.onlinePlayers).toBe(0);
    expect(stats.activeMatches).toBe(0);
    expect(stats.publicRooms).toBe(0);
  });

  test('updatePartyVisibility throws for unknown socket', async () => {
    await expect(svc.updatePartyVisibility('unknown-sock', 'public')).rejects.toThrow(
      'Party not found'
    );
  });
});
