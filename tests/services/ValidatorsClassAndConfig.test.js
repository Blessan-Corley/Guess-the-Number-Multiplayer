'use strict';

/**
 * Tests for remaining low-coverage modules:
 *   - src/utils/validators.js  (Validators class)
 *   - src/utils/validators/inputRules.js  (sanitizeHtml, validateInput, validateBatch)
 *   - config/config.js  (parseBoolean, parseList, parseTrustProxy via validate())
 */

const Validators = require('../../src/utils/validators');
const {
  sanitizeHtml,
  validateInput,
  validateBatch,
} = require('../../src/utils/validators/inputRules');

// ─── Validators (static class) ────────────────────────────────────────────────

describe('Validators static class', () => {
  test('validatePartyCode accepts valid code', () => {
    expect(Validators.validatePartyCode('ABC123').valid).toBe(true);
  });

  test('validatePartyCode rejects empty', () => {
    expect(Validators.validatePartyCode('').valid).toBe(false);
  });

  test('validatePlayerName accepts valid name', () => {
    expect(Validators.validatePlayerName('Alice').valid).toBe(true);
  });

  test('validatePlayerName rejects short name', () => {
    expect(Validators.validatePlayerName('X').valid).toBe(false);
  });

  test('validateGuess accepts valid integer', () => {
    expect(Validators.validateGuess(50, 1, 100).valid).toBe(true);
  });

  test('validateGuess rejects out-of-range', () => {
    expect(Validators.validateGuess(200, 1, 100).valid).toBe(false);
  });

  test('validateSecretNumber delegates to validateGuess', () => {
    expect(Validators.validateSecretNumber(50, 1, 100).valid).toBe(true);
    expect(Validators.validateSecretNumber(0, 1, 100).valid).toBe(false);
  });

  test('validateGameRange accepts valid range', () => {
    expect(Validators.validateGameRange(1, 100).valid).toBe(true);
  });

  test('validateGameSettings accepts valid settings', () => {
    expect(Validators.validateGameSettings({ rangeStart: 1, rangeEnd: 100 }).valid).toBe(true);
  });

  test('validateSocketData accepts object with all required fields', () => {
    expect(Validators.validateSocketData({ name: 'x' }, ['name']).valid).toBe(true);
  });

  test('validateSocketData rejects null', () => {
    expect(Validators.validateSocketData(null, ['name']).valid).toBe(false);
  });

  test('validateReconnectionData accepts complete data', () => {
    const d = { partyCode: 'ABC123', playerId: 'uid', reconnectSecret: 'sec' };
    expect(Validators.validateReconnectionData(d).valid).toBe(true);
  });

  test('sanitizeHtml escapes < and >', () => {
    expect(Validators.sanitizeHtml('<script>')).not.toContain('<');
  });

  test('validateRateLimit allows first action', () => {
    expect(Validators.validateRateLimit('s1', 'make_guess', new Map()).valid).toBe(true);
  });

  test('validateIPAddress accepts valid IPv4', () => {
    expect(Validators.validateIPAddress('127.0.0.1')).toBe(true);
  });

  test('validateSession accepts valid session', () => {
    expect(Validators.validateSession({ playerId: 'uid', partyCode: 'ABC123' }).valid).toBe(true);
  });

  test('validateInput accepts required string', () => {
    const r = Validators.validateInput('hello', { required: true, type: 'string', field: 'name' });
    expect(r.valid).toBe(true);
  });

  test('validateBatch validates multiple fields', () => {
    const r = Validators.validateBatch(
      { name: 'Alice', age: 25 },
      { name: { required: true, type: 'string' }, age: { type: 'number', min: 0 } }
    );
    expect(r.valid).toBe(true);
    expect(r.cleanData).toHaveProperty('name', 'Alice');
  });
});

// ─── sanitizeHtml ─────────────────────────────────────────────────────────────

describe('sanitizeHtml', () => {
  test('escapes & < > " \' /', () => {
    const result = sanitizeHtml('a&b<c>d"e\'f/g');
    expect(result).toBe('a&amp;b&lt;c&gt;d&quot;e&#x27;f&#x2F;g');
  });

  test('returns non-string values unchanged', () => {
    expect(sanitizeHtml(42)).toBe(42);
    expect(sanitizeHtml(null)).toBeNull();
    expect(sanitizeHtml(undefined)).toBeUndefined();
  });

  test('returns empty string unchanged', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

// ─── validateInput ────────────────────────────────────────────────────────────

describe('validateInput', () => {
  test('required: fails for null', () => {
    const r = validateInput(null, { required: true, field: 'x' });
    expect(r.valid).toBe(false);
    expect(r.cleanValue).toBeNull();
  });

  test('required: fails for empty string', () => {
    expect(validateInput('', { required: true }).valid).toBe(false);
  });

  test('type check: fails for wrong type', () => {
    expect(validateInput('abc', { type: 'number', field: 'n' }).valid).toBe(false);
  });

  test('minLength: fails when string too short', () => {
    const r = validateInput('hi', { minLength: 5, field: 'name' });
    expect(r.valid).toBe(false);
  });

  test('maxLength: fails when string too long', () => {
    const r = validateInput('A'.repeat(100), { maxLength: 20 });
    expect(r.valid).toBe(false);
  });

  test('pattern: fails when pattern not matched', () => {
    const r = validateInput('hello!', { pattern: /^[a-z]+$/ });
    expect(r.valid).toBe(false);
  });

  test('sanitize: sanitizes the clean value', () => {
    const r = validateInput('<b>hi</b>', { sanitize: true });
    expect(r.cleanValue).not.toContain('<');
  });

  test('number min: fails below min', () => {
    const r = validateInput(-1, { min: 0 });
    expect(r.valid).toBe(false);
  });

  test('number max: fails above max', () => {
    const r = validateInput(200, { max: 100 });
    expect(r.valid).toBe(false);
  });

  test('number integer: fails for float', () => {
    const r = validateInput(1.5, { integer: true });
    expect(r.valid).toBe(false);
  });

  test('accepts valid number with all checks passing', () => {
    const r = validateInput(50, { min: 1, max: 100, integer: true });
    expect(r.valid).toBe(true);
    expect(r.cleanValue).toBe(50);
  });

  test('accepts valid string with all checks passing', () => {
    const r = validateInput('Alice', {
      type: 'string',
      minLength: 2,
      maxLength: 20,
      pattern: /^[A-Za-z]+$/,
    });
    expect(r.valid).toBe(true);
    expect(r.cleanValue).toBe('Alice');
  });

  test('returns non-string/non-number input unchanged (no type set)', () => {
    const arr = [1, 2, 3];
    const r = validateInput(arr, {});
    expect(r.cleanValue).toBe(arr);
  });

  test('null input with no required rule passes', () => {
    const r = validateInput(null, {});
    expect(r.valid).toBe(true);
  });
});

// ─── validateBatch ────────────────────────────────────────────────────────────

describe('validateBatch', () => {
  test('validates all fields and returns valid cleanData', () => {
    const r = validateBatch(
      { name: 'Bob', score: 42 },
      { name: { required: true, type: 'string' }, score: { type: 'number', min: 0 } }
    );
    expect(r.valid).toBe(true);
    expect(r.cleanData).toMatchObject({ name: 'Bob', score: 42 });
  });

  test('aggregates errors from multiple invalid fields', () => {
    const r = validateBatch(
      { name: '', score: -1 },
      { name: { required: true }, score: { min: 0 } }
    );
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(1);
  });

  test('omits invalid fields from cleanData', () => {
    const r = validateBatch(
      { name: '', score: 10 },
      { name: { required: true }, score: { min: 0 } }
    );
    expect(r.cleanData).not.toHaveProperty('name');
    expect(r.cleanData).toHaveProperty('score', 10);
  });
});

// ─── config: validate() exercises the branch paths ───────────────────────────

describe('config.validate()', () => {
  test('returns an object with warnings array', () => {
    const config = require('../../config/config');
    const result = config.validate();
    expect(result).toHaveProperty('warnings');
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test('config object has expected numeric properties', () => {
    const config = require('../../config/config');
    expect(typeof config.PORT).toBe('number');
    expect(typeof config.MIN_RANGE_SIZE).toBe('number');
    expect(typeof config.MAX_RANGE_SIZE).toBe('number');
    expect(typeof config.SELECTION_TIME_LIMIT).toBe('number');
    expect(typeof config.MAX_PLAYERS_PER_PARTY).toBe('number');
  });

  test('config CORS origins is an array', () => {
    const config = require('../../config/config');
    expect(Array.isArray(config.SOCKET_CORS_ORIGINS)).toBe(true);
  });

  test('config game messages is an object', () => {
    const config = require('../../config/config');
    expect(typeof config.GAME_MESSAGES).toBe('object');
  });
});
