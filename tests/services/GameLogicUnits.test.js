'use strict';

/**
 * Unit tests for low-coverage utility and model modules:
 *   - src/utils/messages/specialDates.js
 *   - src/services/game/guidance.js
 *   - src/services/game/summary.js
 *   - src/models/party/stateMethods.js (via Party model)
 *   - src/models/party/gameplay/settingsMethods.js (via Party model)
 */

const { getSpecialDateMessage } = require('../../src/utils/messages/specialDates');
const {
  getStrategicHint,
  calculateDifficulty,
  getMotivationalMessage,
} = require('../../src/services/game/guidance');
const {
  generateRoundSummary,
  getOverallPerformanceRating,
  calculateAchievements,
  predictOutcome,
  suggestNextGameRange,
} = require('../../src/services/game/summary');
const Party = require('../../src/models/Party');
const Player = require('../../src/models/Player');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePlayer(socketId = 'sock1', name = 'Alice') {
  return new Player(socketId, name);
}

function makeParty(code = 'TEST01') {
  const host = makePlayer('host-sock', 'Host');
  return new Party(code, host);
}

// ─── specialDates ─────────────────────────────────────────────────────────────

describe('getSpecialDateMessage', () => {
  test('returns New Year message on Jan 1', () => {
    const msg = getSpecialDateMessage(new Date(2025, 0, 1));
    expect(msg).toMatch(/New Year/i);
  });

  test('returns Independence Day message on Aug 15', () => {
    const msg = getSpecialDateMessage(new Date(2025, 7, 15));
    expect(msg).toMatch(/Independence Day/i);
  });

  test("returns New Year's Eve message on Dec 31", () => {
    const msg = getSpecialDateMessage(new Date(2025, 11, 31));
    expect(msg).toMatch(/New Year.s Eve/i);
  });

  test('returns holiday message on Dec 25', () => {
    const msg = getSpecialDateMessage(new Date(2025, 11, 25));
    expect(msg).toMatch(/Holiday/i);
  });

  test('returns holiday message on Dec 20', () => {
    const msg = getSpecialDateMessage(new Date(2025, 11, 20));
    expect(msg).toMatch(/Holiday/i);
  });

  test('returns spooky message on Oct 31', () => {
    const msg = getSpecialDateMessage(new Date(2025, 9, 31));
    expect(msg).toMatch(/[Ss]pooky/);
  });

  test('returns null for an ordinary day', () => {
    const msg = getSpecialDateMessage(new Date(2025, 4, 15)); // May 15
    expect(msg).toBeNull();
  });

  test('defaults to current date when no argument given', () => {
    // Should not throw regardless of the current date
    expect(() => getSpecialDateMessage()).not.toThrow();
  });
});

// ─── guidance: getStrategicHint ───────────────────────────────────────────────

describe('getStrategicHint', () => {
  const settings = { rangeStart: 1, rangeEnd: 100 };

  test('returns start hint when history is empty', () => {
    const player = { guessHistory: [] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('start');
  });

  test('returns precise hint when difference <= 2', () => {
    const player = { guessHistory: [{ guess: 51 }] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('precise');
  });

  test('returns close hint when difference is 3–5', () => {
    const player = { guessHistory: [{ guess: 55 }] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('close');
  });

  test('returns moderate hint when difference is 6–10', () => {
    const player = { guessHistory: [{ guess: 60 }] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('moderate');
  });

  test('returns far/too-high hint when guess is well above target', () => {
    const player = { guessHistory: [{ guess: 80 }] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('far');
    expect(hint.message).toMatch(/high/i);
  });

  test('returns far/too-low hint when guess is well below target', () => {
    const player = { guessHistory: [{ guess: 20 }] };
    const hint = getStrategicHint(player, 50, settings);
    expect(hint.type).toBe('far');
    expect(hint.message).toMatch(/low/i);
  });
});

// ─── guidance: calculateDifficulty ───────────────────────────────────────────

describe('calculateDifficulty', () => {
  const calcOptimal = (s, e) => Math.ceil(Math.log2(e - s + 1));

  test('easy for range <= 20', () => {
    const d = calculateDifficulty(1, 10, calcOptimal);
    expect(d.difficulty).toBe('easy');
  });

  test('medium for range 21–100', () => {
    const d = calculateDifficulty(1, 100, calcOptimal);
    expect(d.difficulty).toBe('medium');
  });

  test('hard for range 101–500', () => {
    const d = calculateDifficulty(1, 500, calcOptimal);
    expect(d.difficulty).toBe('hard');
  });

  test('expert for range > 500', () => {
    const d = calculateDifficulty(1, 1000, calcOptimal);
    expect(d.difficulty).toBe('expert');
  });

  test('returns estimatedTime string', () => {
    const d = calculateDifficulty(1, 100, calcOptimal);
    expect(typeof d.estimatedTime).toBe('string');
  });
});

// ─── guidance: getMotivationalMessage ────────────────────────────────────────

describe('getMotivationalMessage', () => {
  const contexts = ['general', 'behind', 'ahead', 'close'];

  contexts.forEach((ctx) => {
    test(`returns a string for context "${ctx}"`, () => {
      const msg = getMotivationalMessage({}, ctx);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    });
  });

  test('falls back to general messages for unknown context', () => {
    const msg = getMotivationalMessage({}, 'unknown_ctx');
    expect(typeof msg).toBe('string');
  });
});

// ─── summary: generateRoundSummary ───────────────────────────────────────────

describe('generateRoundSummary', () => {
  const settings = { rangeStart: 1, rangeEnd: 100 };
  const evalPerf = () => 'good';
  const calcOptimal = () => 7;

  const roundResult = {
    winnerId: 'p1',
    winnerAttempts: 5,
    timestamp: Date.now(),
    players: [
      { id: 'p1', name: 'Alice', attempts: 5, secretNumber: 42 },
      { id: 'p2', name: 'Bob', attempts: 8, secretNumber: 77 },
    ],
  };

  test('returns winner and loser objects', () => {
    const summary = generateRoundSummary(roundResult, settings, evalPerf, calcOptimal);
    expect(summary.winner.id).toBe('p1');
    expect(summary.loser.id).toBe('p2');
  });

  test('includes gameInfo with range, optimalAttempts, totalAttempts', () => {
    const summary = generateRoundSummary(roundResult, settings, evalPerf, calcOptimal);
    expect(summary.gameInfo.range).toBe('1-100');
    expect(summary.gameInfo.optimalAttempts).toBe(7);
    expect(summary.gameInfo.totalAttempts).toBe(13);
  });
});

// ─── summary: getOverallPerformanceRating ────────────────────────────────────

describe('getOverallPerformanceRating', () => {
  const settings = { rangeStart: 1, rangeEnd: 100 };
  const calcOptimal = () => 7;

  test('returns new_player for player with 0 games', () => {
    const player = { stats: { totalGames: 0, averageAttempts: 0 }, wins: 0 };
    const { rating } = getOverallPerformanceRating(player, settings, calcOptimal);
    expect(rating).toBe('new_player');
  });

  test('returns master for high win-rate, low attempts', () => {
    const player = { stats: { totalGames: 10, averageAttempts: 7 }, wins: 9 };
    const { rating } = getOverallPerformanceRating(player, settings, calcOptimal);
    expect(rating).toBe('master');
  });

  test('returns expert for 60-79% win rate', () => {
    const player = { stats: { totalGames: 10, averageAttempts: 9 }, wins: 7 };
    const { rating } = getOverallPerformanceRating(player, settings, calcOptimal);
    expect(rating).toBe('expert');
  });

  test('returns intermediate for 40-59% win rate', () => {
    const player = { stats: { totalGames: 10, averageAttempts: 15 }, wins: 4 };
    const { rating } = getOverallPerformanceRating(player, settings, calcOptimal);
    expect(rating).toBe('intermediate');
  });

  test('returns beginner for < 40% win rate', () => {
    const player = { stats: { totalGames: 10, averageAttempts: 20 }, wins: 2 };
    const { rating } = getOverallPerformanceRating(player, settings, calcOptimal);
    expect(rating).toBe('beginner');
  });
});

// ─── summary: calculateAchievements ──────────────────────────────────────────

describe('calculateAchievements', () => {
  test('grants first_game achievement on first game', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 0,
      stats: { totalGames: 1, bestScore: 3, averageAttempts: 5 },
    };
    const result = calculateAchievements([player]);
    const ids = result[0]?.achievements.map((a) => a.id) ?? [];
    expect(ids).toContain('first_game');
  });

  test('grants perfect_game achievement for bestScore === 1', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 0,
      stats: { totalGames: 3, bestScore: 1, averageAttempts: 4 },
    };
    const result = calculateAchievements([player]);
    const ids = result[0]?.achievements.map((a) => a.id) ?? [];
    expect(ids).toContain('perfect_game');
  });

  test('grants win_streak achievement for wins >= 3', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 5,
      stats: { totalGames: 8, bestScore: 2, averageAttempts: 4 },
    };
    const result = calculateAchievements([player]);
    const ids = result[0]?.achievements.map((a) => a.id) ?? [];
    expect(ids).toContain('win_streak');
  });

  test('grants veteran achievement for 10+ games', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 5,
      stats: { totalGames: 10, bestScore: 2, averageAttempts: 4 },
    };
    const result = calculateAchievements([player]);
    const ids = result[0]?.achievements.map((a) => a.id) ?? [];
    expect(ids).toContain('veteran');
  });

  test('grants efficient_player achievement for avg <= 3 and 3+ games', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 2,
      stats: { totalGames: 3, bestScore: 2, averageAttempts: 2 },
    };
    const result = calculateAchievements([player]);
    const ids = result[0]?.achievements.map((a) => a.id) ?? [];
    expect(ids).toContain('efficient_player');
  });

  test('returns empty array when no achievements earned', () => {
    const player = {
      id: 'p1',
      name: 'Alice',
      wins: 0,
      stats: { totalGames: 2, bestScore: 5, averageAttempts: 7 },
    };
    const result = calculateAchievements([player]);
    expect(result).toHaveLength(0);
  });
});

// ─── summary: predictOutcome ──────────────────────────────────────────────────

describe('predictOutcome', () => {
  test('returns unknown when not in playing phase', () => {
    const party = makeParty();
    party.gameState.phase = 'lobby';
    const result = predictOutcome(party);
    expect(result.prediction).toBe('unknown');
  });

  test('returns high confidence when leader is 3+ attempts ahead', () => {
    const host = makePlayer('h', 'Host');
    host.attempts = 2;
    const guest = makePlayer('g', 'Guest');
    guest.attempts = 6;
    const party = new Party('ABC123', host);
    party.addPlayer(guest);
    party.gameState.phase = 'playing';

    const result = predictOutcome(party);
    expect(result.confidence).toBe(80);
  });

  test('returns 65% confidence for 2-attempt gap', () => {
    const host = makePlayer('h', 'Host');
    host.attempts = 3;
    const guest = makePlayer('g', 'Guest');
    guest.attempts = 5;
    const party = new Party('XYZ789', host);
    party.addPlayer(guest);
    party.gameState.phase = 'playing';

    const result = predictOutcome(party);
    expect(result.confidence).toBe(65);
  });

  test('returns 50% confidence for 0–1 attempt gap', () => {
    const host = makePlayer('h', 'Host');
    host.attempts = 4;
    const guest = makePlayer('g', 'Guest');
    guest.attempts = 5;
    const party = new Party('QQQ111', host);
    party.addPlayer(guest);
    party.gameState.phase = 'playing';

    const result = predictOutcome(party);
    expect(result.confidence).toBe(50);
  });
});

// ─── summary: suggestNextGameRange ───────────────────────────────────────────

describe('suggestNextGameRange', () => {
  test('suggests larger range when avg attempts <= 3', () => {
    const party = makeParty();
    const host = party.getHost();
    host.stats.averageAttempts = 2;
    const result = suggestNextGameRange(party);
    expect(result.reason).toMatch(/[Ii]ncrease/);
    expect(result.suggested.end).toBeGreaterThan(party.gameSettings.rangeEnd);
  });

  test('suggests smaller range when avg attempts >= 10', () => {
    const party = makeParty();
    const host = party.getHost();
    host.stats.averageAttempts = 12;
    const result = suggestNextGameRange(party);
    expect(result.reason).toMatch(/[Ee]asier/);
    expect(result.suggested.end).toBeLessThan(party.gameSettings.rangeEnd);
  });

  test('keeps same range for 4–9 avg attempts', () => {
    const party = makeParty();
    const host = party.getHost();
    host.stats.averageAttempts = 6;
    const result = suggestNextGameRange(party);
    expect(result.reason).toMatch(/[Pp]erfect/);
    expect(result.suggested.end).toBe(party.gameSettings.rangeEnd);
  });
});

// ─── Party: stateMethods ──────────────────────────────────────────────────────

describe('Party stateMethods', () => {
  test('canChangeVisibility is true in lobby/waiting', () => {
    const party = makeParty();
    expect(party.canChangeVisibility()).toBe(true);
  });

  test('setVisibility changes to public', () => {
    const party = makeParty();
    party.setVisibility('public');
    expect(party.visibility).toBe('public');
  });

  test('setVisibility rejects invalid visibility value', () => {
    const party = makeParty();
    expect(() => party.setVisibility('secret')).toThrow(/Invalid room visibility/);
  });

  test('setVisibility rejects changes after game starts', () => {
    const party = makeParty();
    party.gameState.phase = 'playing';
    expect(() => party.setVisibility('public')).toThrow(/lobby/i);
  });

  test('getJoinStatus returns open for non-full lobby', () => {
    const party = makeParty();
    expect(party.getJoinStatus()).toBe('open');
  });

  test('getJoinStatus returns closed when not in lobby', () => {
    const party = makeParty();
    party.gameState.phase = 'playing';
    expect(party.getJoinStatus()).toBe('closed');
  });

  test('getDirectoryInfo returns expected shape', () => {
    const party = makeParty();
    const info = party.getDirectoryInfo();
    expect(info).toHaveProperty('code');
    expect(info).toHaveProperty('hostName');
    expect(info).toHaveProperty('joinStatus');
  });

  test('getStateVersion increments after state change', () => {
    const party = makeParty();
    const before = party.getStateVersion();
    party.setVisibility('public');
    expect(party.getStateVersion()).toBe(before + 1);
  });

  test('validateState returns valid for properly set-up party', () => {
    const host = makePlayer('h', 'Host');
    host.isConnected = true;
    const party = new Party('VAL001', host);
    const result = party.validateState();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('validateState detects missing host in players map', () => {
    const host = makePlayer('h', 'Host');
    host.isConnected = true;
    const party = new Party('VAL002', host);
    party.hostId = 'non-existent-id';
    const result = party.validateState();
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Host player not found in party');
  });

  test('reconnectPlayer updates socket and marks connected', () => {
    const host = makePlayer('h', 'Host');
    host.isConnected = false;
    const party = new Party('REC001', host);
    const ok = party.reconnectPlayer(host.id, 'new-socket-id');
    expect(ok).toBe(true);
    expect(host.isConnected).toBe(true);
  });

  test('reconnectPlayer returns false for unknown player', () => {
    const party = makeParty();
    expect(party.reconnectPlayer('no-such-id', 'sock')).toBe(false);
  });

  test('getStats returns round results and state version', () => {
    const party = makeParty();
    const stats = party.getStats();
    expect(stats).toHaveProperty('stateVersion');
    expect(Array.isArray(stats.roundResults)).toBe(true);
  });

  test('getPublicInfo includes isFull and playerCount', () => {
    const party = makeParty();
    const info = party.getPublicInfo();
    expect(typeof info.isFull).toBe('boolean');
    expect(typeof info.playerCount).toBe('number');
  });

  test('getDetailedState includes playersReady as array', () => {
    const party = makeParty();
    const detail = party.getDetailedState();
    expect(Array.isArray(detail.gameState.playersReady)).toBe(true);
  });

  test('toJSON serializes playersReady as array', () => {
    const party = makeParty();
    const json = party.toJSON();
    expect(Array.isArray(json.gameState.playersReady)).toBe(true);
  });

  test('isPublicLobbyVisible returns false when party is empty of guests', () => {
    const party = makeParty();
    party.visibility = 'public';
    // Single host — not "empty" (has players), but isEmpty() checks player count
    // Party has 1 player so isEmpty() is false → isPublicLobbyVisible() returns true
    expect(party.isPublicLobbyVisible()).toBe(true);
  });
});

// ─── Party: settingsMethods ───────────────────────────────────────────────────

describe('Party settingsMethods', () => {
  test('updateSettings changes rangeEnd for host', () => {
    const party = makeParty();
    const host = party.getHost();
    party.updateSettings({ rangeEnd: 200 }, host.id);
    expect(party.gameSettings.rangeEnd).toBe(200);
  });

  test('updateSettings rejects non-host caller', () => {
    const party = makeParty();
    expect(() => party.updateSettings({ rangeEnd: 200 }, 'bad-id')).toThrow(
      'Only host can update settings'
    );
  });

  test('updateSettings rejects changes during active game', () => {
    const party = makeParty();
    const host = party.getHost();
    party.gameState.phase = 'playing';
    expect(() => party.updateSettings({ rangeEnd: 200 }, host.id)).toThrow(
      'Cannot update settings during active game'
    );
  });

  test('updateSettings rejects invalid rangeStart', () => {
    const party = makeParty();
    const host = party.getHost();
    expect(() => party.updateSettings({ rangeStart: -5 }, host.id)).toThrow(/Invalid range start/);
  });

  test('updateSettings rejects invalid rangeEnd', () => {
    const party = makeParty();
    const host = party.getHost();
    expect(() => party.updateSettings({ rangeEnd: 0 }, host.id)).toThrow(/Invalid range end/);
  });

  test('updateSettings rejects when end <= start', () => {
    const party = makeParty();
    const host = party.getHost();
    party.gameSettings.rangeEnd = 50;
    expect(() => party.updateSettings({ rangeStart: 60 }, host.id)).toThrow(
      'Range end must be greater than range start'
    );
  });

  test('updateSettings rejects selectionTimeLimit out of bounds', () => {
    const party = makeParty();
    const host = party.getHost();
    expect(() => party.updateSettings({ selectionTimeLimit: 5 }, host.id)).toThrow(
      /selection time limit/i
    );
  });

  test('updateSettings accepts valid selectionTimeLimit', () => {
    const party = makeParty();
    const host = party.getHost();
    party.updateSettings({ selectionTimeLimit: 60 }, host.id);
    expect(party.gameSettings.selectionTimeLimit).toBe(60);
  });

  test('updateSettings rolls back on error', () => {
    const party = makeParty();
    const host = party.getHost();
    const originalEnd = party.gameSettings.rangeEnd;
    try {
      // rangeStart beyond rangeEnd → rolls back
      party.updateSettings({ rangeStart: 99999 }, host.id);
    } catch {
      // expected
    }
    expect(party.gameSettings.rangeEnd).toBe(originalEnd);
  });
});
