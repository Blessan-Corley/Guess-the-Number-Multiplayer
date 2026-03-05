'use strict';

/**
 * Tests for low-coverage validator and utility modules:
 *   - src/utils/validators/gameRules.js
 *   - src/utils/validators/networkRules.js
 *   - src/utils/messageGenerator.js
 *   - src/services/party/reporting.js
 */

const {
  validatePartyCode,
  validatePlayerName,
  validateGuess,
  validateGameRange,
  validateGameSettings,
} = require('../../src/utils/validators/gameRules');

const {
  validateSocketData,
  validateReconnectionData,
  validateRateLimit,
  validateIPAddress,
  validateSession,
} = require('../../src/utils/validators/networkRules');

const messageGenerator = require('../../src/utils/messageGenerator');
const {
  formatPartyDetails,
  formatStats,
  formatSystemHealth,
} = require('../../src/services/party/reporting');
const Party = require('../../src/models/Party');
const Player = require('../../src/models/Player');

// ─── validatePartyCode ────────────────────────────────────────────────────────

describe('validatePartyCode', () => {
  test('accepts a valid 6-char alphanumeric code', () => {
    const result = validatePartyCode('ABC123');
    expect(result.valid).toBe(true);
    expect(result.cleanValue).toBe('ABC123');
  });

  test('upcases and trims', () => {
    const result = validatePartyCode('  abc123  ');
    expect(result.valid).toBe(true);
    expect(result.cleanValue).toBe('ABC123');
  });

  test('rejects null / undefined / empty', () => {
    expect(validatePartyCode(null).valid).toBe(false);
    expect(validatePartyCode('').valid).toBe(false);
    expect(validatePartyCode(undefined).valid).toBe(false);
  });

  test('rejects non-string type', () => {
    const result = validatePartyCode(123456);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/string/i);
  });

  test('rejects wrong length', () => {
    const result = validatePartyCode('AB');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('characters long'))).toBe(true);
  });

  test('rejects special characters', () => {
    const result = validatePartyCode('AB-$!@');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('letters and numbers'))).toBe(true);
  });

  test('cleanValue is null for null input', () => {
    expect(validatePartyCode(null).cleanValue).toBeNull();
  });
});

// ─── validatePlayerName ───────────────────────────────────────────────────────

describe('validatePlayerName', () => {
  test('accepts a valid name', () => {
    expect(validatePlayerName('Alice').valid).toBe(true);
  });

  test('trims surrounding whitespace', () => {
    const result = validatePlayerName('  Bob  ');
    expect(result.cleanValue).toBe('Bob');
  });

  test('rejects null / empty', () => {
    expect(validatePlayerName(null).valid).toBe(false);
    expect(validatePlayerName('').valid).toBe(false);
  });

  test('rejects non-string', () => {
    expect(validatePlayerName(42).valid).toBe(false);
  });

  test('rejects name that is too short', () => {
    const result = validatePlayerName('A');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least'))).toBe(true);
  });

  test('rejects name that is too long', () => {
    const result = validatePlayerName('A'.repeat(30));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('longer than'))).toBe(true);
  });

  test('rejects name with forbidden characters', () => {
    const result = validatePlayerName('Alice<>');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('letters, numbers'))).toBe(true);
  });

  test('rejects restricted words (admin)', () => {
    const result = validatePlayerName('AdminUser');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('restricted'))).toBe(true);
  });

  test('rejects restricted word "bot"', () => {
    expect(validatePlayerName('botmaster').valid).toBe(false);
  });

  test('cleanValue is null for null input', () => {
    expect(validatePlayerName(null).cleanValue).toBeNull();
  });

  test('rejects whitespace-only name', () => {
    expect(validatePlayerName('   ').valid).toBe(false);
  });
});

// ─── validateGuess ────────────────────────────────────────────────────────────

describe('validateGuess', () => {
  test('accepts valid integer within range', () => {
    const result = validateGuess(50, 1, 100);
    expect(result.valid).toBe(true);
    expect(result.cleanValue).toBe(50);
  });

  test('rejects null guess', () => {
    expect(validateGuess(null, 1, 100).valid).toBe(false);
  });

  test('rejects undefined guess', () => {
    expect(validateGuess(undefined, 1, 100).valid).toBe(false);
  });

  test('rejects NaN', () => {
    expect(validateGuess(NaN, 1, 100).valid).toBe(false);
  });

  test('rejects string guess', () => {
    expect(validateGuess('50', 1, 100).valid).toBe(false);
  });

  test('rejects float', () => {
    const result = validateGuess(50.5, 1, 100);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/whole number/i);
  });

  test('rejects guess below range', () => {
    const result = validateGuess(0, 1, 100);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at least/i);
  });

  test('rejects guess above range', () => {
    const result = validateGuess(101, 1, 100);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at most/i);
  });

  test('accepts boundary values', () => {
    expect(validateGuess(1, 1, 100).valid).toBe(true);
    expect(validateGuess(100, 1, 100).valid).toBe(true);
  });

  test('cleanValue is null for non-number', () => {
    expect(validateGuess('x', 1, 100).cleanValue).toBeNull();
  });
});

// ─── validateGameRange ────────────────────────────────────────────────────────

describe('validateGameRange', () => {
  test('accepts valid range', () => {
    const result = validateGameRange(1, 100);
    expect(result.valid).toBe(true);
    expect(result.cleanValue).toEqual({ start: 1, end: 100 });
  });

  test('rejects non-number start', () => {
    expect(validateGameRange('one', 100).valid).toBe(false);
  });

  test('rejects non-number end', () => {
    expect(validateGameRange(1, 'hundred').valid).toBe(false);
  });

  test('rejects start below MIN_RANGE_VALUE', () => {
    expect(validateGameRange(-5, 100).valid).toBe(false);
  });

  test('rejects end above MAX_RANGE_VALUE', () => {
    expect(validateGameRange(1, 100000).valid).toBe(false);
  });

  test('rejects range where end <= start', () => {
    const result = validateGameRange(50, 50);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('greater than'))).toBe(true);
  });

  test('rejects range smaller than MIN_RANGE_SIZE', () => {
    const result = validateGameRange(1, 3);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least'))).toBe(true);
  });

  test('cleanValue is null when invalid', () => {
    expect(validateGameRange(1, 2).cleanValue).toBeNull();
  });
});

// ─── validateGameSettings ─────────────────────────────────────────────────────

describe('validateGameSettings', () => {
  test('accepts valid settings with range and timeLimit', () => {
    const result = validateGameSettings({ rangeStart: 1, rangeEnd: 100, selectionTimeLimit: 30 });
    expect(result.valid).toBe(true);
    expect(result.cleanValue.rangeStart).toBe(1);
    expect(result.cleanValue.selectionTimeLimit).toBe(30);
  });

  test('accepts empty settings (no keys provided)', () => {
    const result = validateGameSettings({});
    expect(result.valid).toBe(true);
  });

  test('rejects invalid selectionTimeLimit (too low)', () => {
    const result = validateGameSettings({ selectionTimeLimit: 5 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/10 and 120/);
  });

  test('rejects invalid selectionTimeLimit (too high)', () => {
    const result = validateGameSettings({ selectionTimeLimit: 200 });
    expect(result.valid).toBe(false);
  });

  test('rejects invalid range', () => {
    const result = validateGameSettings({ rangeStart: 90, rangeEnd: 10 });
    expect(result.valid).toBe(false);
  });

  test('includes selectionTimeLimit from defaults when only rangeStart provided', () => {
    const result = validateGameSettings({ rangeStart: 1 });
    expect(result.valid).toBe(true);
  });
});

// ─── validateSocketData ───────────────────────────────────────────────────────

describe('validateSocketData', () => {
  test('accepts valid object with required fields present', () => {
    const result = validateSocketData({ partyCode: 'ABC123', name: 'Alice' }, [
      'partyCode',
      'name',
    ]);
    expect(result.valid).toBe(true);
  });

  test('rejects null data', () => {
    expect(validateSocketData(null, ['partyCode']).valid).toBe(false);
  });

  test('rejects non-object data', () => {
    expect(validateSocketData('string', ['partyCode']).valid).toBe(false);
  });

  test('rejects when required field is missing', () => {
    const result = validateSocketData({ name: 'Alice' }, ['partyCode', 'name']);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/partyCode/);
  });

  test('accepts when no required fields specified', () => {
    expect(validateSocketData({ foo: 'bar' }, []).valid).toBe(true);
  });
});

// ─── validateReconnectionData ─────────────────────────────────────────────────

describe('validateReconnectionData', () => {
  const valid = { partyCode: 'ABC123', playerId: 'uuid-1', reconnectSecret: 'secret-abc' };

  test('accepts valid reconnection data', () => {
    expect(validateReconnectionData(valid).valid).toBe(true);
  });

  test('rejects missing partyCode', () => {
    const result = validateReconnectionData({ ...valid, partyCode: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Party code'))).toBe(true);
  });

  test('rejects invalid partyCode format', () => {
    const result = validateReconnectionData({ ...valid, partyCode: '!!!!!!' });
    expect(result.valid).toBe(false);
  });

  test('rejects missing playerId', () => {
    const result = validateReconnectionData({ ...valid, playerId: '' });
    expect(result.valid).toBe(false);
  });

  test('rejects non-string playerId', () => {
    const result = validateReconnectionData({ ...valid, playerId: 12345 });
    expect(result.valid).toBe(false);
  });

  test('rejects missing reconnectSecret', () => {
    const result = validateReconnectionData({ ...valid, reconnectSecret: '' });
    expect(result.valid).toBe(false);
  });

  test('cleanValue normalises partyCode to uppercase', () => {
    const result = validateReconnectionData({ ...valid, partyCode: 'abc123' });
    expect(result.cleanValue.partyCode).toBe('ABC123');
  });
});

// ─── validateRateLimit ────────────────────────────────────────────────────────

describe('validateRateLimit', () => {
  test('allows action on fresh rate-limit map', () => {
    const result = validateRateLimit('sock1', 'make_guess', new Map());
    expect(result.valid).toBe(true);
  });

  test('blocks action that was just performed', () => {
    const limits = new Map();
    validateRateLimit('sock1', 'make_guess', limits);
    const result = validateRateLimit('sock1', 'make_guess', limits);
    expect(result.valid).toBe(false);
    expect(result).toHaveProperty('remainingTime');
  });

  test('allows action for different socket', () => {
    const limits = new Map();
    validateRateLimit('sock1', 'make_guess', limits);
    const result = validateRateLimit('sock2', 'make_guess', limits);
    expect(result.valid).toBe(true);
  });

  test('falls back to 1 second cooldown for unknown action', () => {
    const limits = new Map();
    validateRateLimit('sock1', 'unknown_action', limits);
    const result = validateRateLimit('sock1', 'unknown_action', limits);
    expect(result.valid).toBe(false);
  });

  test('uses known cooldowns: create_party, join_party, start_game, rematch', () => {
    const actions = ['create_party', 'join_party', 'start_game', 'rematch'];
    actions.forEach((action) => {
      const limits = new Map();
      validateRateLimit('s', action, limits);
      const r = validateRateLimit('s', action, limits);
      expect(r.valid).toBe(false);
    });
  });
});

// ─── validateIPAddress ────────────────────────────────────────────────────────

describe('validateIPAddress', () => {
  test('accepts valid IPv4', () => {
    expect(validateIPAddress('192.168.1.1')).toBe(true);
    expect(validateIPAddress('0.0.0.0')).toBe(true);
    expect(validateIPAddress('255.255.255.255')).toBe(true);
  });

  test('rejects malformed IPv4', () => {
    expect(validateIPAddress('999.0.0.1')).toBe(false);
    expect(validateIPAddress('192.168.1')).toBe(false);
  });

  test('accepts valid full IPv6', () => {
    expect(validateIPAddress('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
  });

  test('rejects random string', () => {
    expect(validateIPAddress('not-an-ip')).toBe(false);
  });
});

// ─── validateSession ──────────────────────────────────────────────────────────

describe('validateSession', () => {
  const valid = { playerId: 'uuid-1', partyCode: 'ABC123' };

  test('accepts valid session data', () => {
    expect(validateSession(valid).valid).toBe(true);
  });

  test('rejects null session', () => {
    expect(validateSession(null).valid).toBe(false);
  });

  test('rejects missing playerId', () => {
    expect(validateSession({ partyCode: 'ABC123' }).valid).toBe(false);
  });

  test('rejects non-string playerId', () => {
    expect(validateSession({ playerId: 42, partyCode: 'ABC123' }).valid).toBe(false);
  });

  test('rejects missing partyCode', () => {
    expect(validateSession({ playerId: 'uuid-1' }).valid).toBe(false);
  });

  test('rejects invalid partyCode format', () => {
    expect(validateSession({ playerId: 'uuid-1', partyCode: '!!!!!!' }).valid).toBe(false);
  });

  test('rejects non-number timestamp', () => {
    const result = validateSession({ ...valid, timestamp: 'yesterday' });
    expect(result.valid).toBe(false);
  });

  test('accepts numeric timestamp', () => {
    const result = validateSession({ ...valid, timestamp: Date.now() });
    expect(result.valid).toBe(true);
  });
});

// ─── MessageGenerator ─────────────────────────────────────────────────────────

describe('MessageGenerator', () => {
  test('getRandomMessage returns string for valid category', () => {
    const msg = messageGenerator.getRandomMessage('correct');
    expect(typeof msg).toBe('string');
  });

  test('getRandomMessage falls back to default for unknown category', () => {
    const msg = messageGenerator.getRandomMessage('__nonexistent__');
    expect(typeof msg).toBe('string');
  });

  test('getDefaultMessage returns fallback string', () => {
    expect(typeof messageGenerator.getDefaultMessage('correct')).toBe('string');
    expect(typeof messageGenerator.getDefaultMessage('__unknown__')).toBe('string');
  });

  test('getContextualMessage returns string for gameStart', () => {
    expect(typeof messageGenerator.getContextualMessage('gameStart')).toBe('string');
  });

  test('getEncouragementMessage: first try', () => {
    expect(messageGenerator.getEncouragementMessage(1, 7)).toMatch(/[Ff]irst/);
  });

  test('getEncouragementMessage: excellent when <= optimal', () => {
    expect(messageGenerator.getEncouragementMessage(5, 7)).toMatch(/[Ee]xcellent/);
  });

  test('getEncouragementMessage: good when <= 1.5x optimal', () => {
    expect(messageGenerator.getEncouragementMessage(9, 7)).toMatch(/[Gg]ood/);
  });

  test('getEncouragementMessage: hang in there when <= 2x optimal', () => {
    expect(messageGenerator.getEncouragementMessage(13, 7)).toMatch(/[Hh]ang/);
  });

  test('getEncouragementMessage: fallback for very high attempts', () => {
    expect(messageGenerator.getEncouragementMessage(100, 7)).toMatch(/closer/i);
  });

  test('getCelebrationMessage returns string', () => {
    expect(typeof messageGenerator.getCelebrationMessage('quick')).toBe('string');
  });

  test('getCelebrationMessage uses normal as fallback', () => {
    expect(typeof messageGenerator.getCelebrationMessage('__unknown__')).toBe('string');
  });

  test('getTrashTalkMessage returns string', () => {
    expect(typeof messageGenerator.getTrashTalkMessage()).toBe('string');
  });

  test('getWaitingMessage returns string for opponent context', () => {
    expect(typeof messageGenerator.getWaitingMessage('opponent')).toBe('string');
  });

  test('getWaitingMessage falls back for unknown context', () => {
    expect(typeof messageGenerator.getWaitingMessage('__unknown__')).toBe('string');
  });

  test('getErrorMessage returns string for connection error', () => {
    expect(typeof messageGenerator.getErrorMessage('connection')).toBe('string');
  });

  test('getPersonalizedMessage: dominating (>= 80% win rate)', () => {
    const msg = messageGenerator.getPersonalizedMessage({
      stats: { totalGames: 10, totalWins: 9 },
    });
    expect(msg).toMatch(/dominating/i);
  });

  test('getPersonalizedMessage: on fire (60-79%)', () => {
    const msg = messageGenerator.getPersonalizedMessage({
      stats: { totalGames: 10, totalWins: 7 },
    });
    expect(msg).toMatch(/fire/i);
  });

  test('getPersonalizedMessage: keep up (40-59%)', () => {
    const msg = messageGenerator.getPersonalizedMessage({
      stats: { totalGames: 10, totalWins: 4 },
    });
    expect(msg).toMatch(/good work/i);
  });

  test('getPersonalizedMessage: first game', () => {
    const msg = messageGenerator.getPersonalizedMessage({
      stats: { totalGames: 1, totalWins: 0 },
    });
    expect(msg).toMatch(/[Ww]elcome/);
  });

  test('getPersonalizedMessage: practice (< 40% win rate)', () => {
    const msg = messageGenerator.getPersonalizedMessage({
      stats: { totalGames: 10, totalWins: 2 },
    });
    expect(msg).toMatch(/[Pp]ractice/);
  });

  test('formatMessage replaces template variables', () => {
    const result = messageGenerator.formatMessage('Hello {name}!', { name: 'Alice' });
    expect(result).toBe('Hello Alice!');
  });

  test('formatMessage replaces multiple occurrences', () => {
    const result = messageGenerator.formatMessage('{x} + {x} = {y}', { x: '2', y: '4' });
    expect(result).toBe('2 + 2 = 4');
  });

  test('formatMessage returns template unchanged when no vars', () => {
    const result = messageGenerator.formatMessage('Hello World');
    expect(result).toBe('Hello World');
  });

  test('getSpecialMessage returns string', () => {
    expect(typeof messageGenerator.getSpecialMessage()).toBe('string');
  });
});

// ─── reporting: formatPartyDetails ───────────────────────────────────────────

describe('formatPartyDetails', () => {
  function makeTestParty() {
    const host = new Player('h', 'Host');
    host.isConnected = true;
    const party = new Party('REP001', host);
    return party;
  }

  test('returns expected shape', () => {
    const party = makeTestParty();
    const details = formatPartyDetails(party);
    expect(details).toHaveProperty('code', 'REP001');
    expect(details).toHaveProperty('phase');
    expect(Array.isArray(details.players)).toBe(true);
    expect(typeof details.isInactive).toBe('boolean');
  });

  test('maps each player to expected fields', () => {
    const party = makeTestParty();
    const details = formatPartyDetails(party);
    const p = details.players[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('name', 'Host');
    expect(p).toHaveProperty('isHost', true);
  });
});

describe('formatStats', () => {
  test('returns correct counts', () => {
    const stats = { totalPartiesCreated: 5, totalPlayersJoined: 10, gamesCompleted: 3 };
    const result = formatStats(stats, [1, 2], 4);
    expect(result.activeParties).toBe(2);
    expect(result.activePlayers).toBe(4);
    expect(result.gamesCompleted).toBe(3);
  });
});

describe('formatSystemHealth', () => {
  test('returns healthy:true with memory and party stats', () => {
    const result = formatSystemHealth({
      totalParties: 5,
      activeParties: [1, 2],
      activePlayers: 4,
      stats: { totalPlayersJoined: 10 },
      memoryUsage: {
        rss: 50 * 1024 * 1024,
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 60 * 1024 * 1024,
      },
    });
    expect(result.healthy).toBe(true);
    expect(result.parties.total).toBe(5);
    expect(result.parties.active).toBe(2);
    expect(result.parties.inactive).toBe(3);
    expect(result.memory).toHaveProperty('rss');
  });
});
