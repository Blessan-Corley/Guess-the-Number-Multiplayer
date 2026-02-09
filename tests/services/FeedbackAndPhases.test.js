'use strict';

/**
 * Tests for:
 *   - src/services/game/feedback.js  (generateFeedback, evaluatePerformance, getContextualFeedback)
 *   - src/models/party/gameplay/phaseMethods.js  (startGame, setPlayerReady, nextRound, rematch, etc.)
 *   - src/services/party/sessionMethods.js  (via PartyService)
 *   - src/services/party/metricsMethods.js  (via PartyService)
 */

const {
  generateFeedback,
  calculateOptimalAttempts,
  evaluatePerformance,
  getContextualFeedback,
} = require('../../src/services/game/feedback');
const Party = require('../../src/models/Party');
const Player = require('../../src/models/Player');
const PartyService = require('../../src/services/PartyService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const msgGen = { getRandomMessage: (key) => `[${key}]` };

function makeConnectedPlayer(socketId, name) {
  const p = new Player(socketId, name);
  p.isConnected = true;
  return p;
}

function makeTwoPlayerParty() {
  const host = makeConnectedPlayer('h', 'Host');
  const party = new Party('TEST01', host);
  const guest = makeConnectedPlayer('g', 'Guest');
  party.addPlayer(guest);
  return { party, host, guest };
}

// ─── generateFeedback ─────────────────────────────────────────────────────────

describe('generateFeedback', () => {
  test('returns success on correct guess', () => {
    const fb = generateFeedback(50, 50, 1, 100, msgGen);
    expect(fb.isCorrect).toBe(true);
    expect(fb.type).toBe('success');
  });

  test('returns TOO_HIGH direction for high guess, large range', () => {
    const fb = generateFeedback(80, 50, 1, 100, msgGen);
    expect(fb.direction).toBe('high');
    expect(fb.isCorrect).toBe(false);
  });

  test('returns TOO_LOW direction for low guess, large range', () => {
    const fb = generateFeedback(20, 50, 1, 100, msgGen);
    expect(fb.direction).toBe('low');
  });

  test('closeness=very_close when diff <= veryCloseThreshold (range <= 20)', () => {
    const fb = generateFeedback(10, 11, 1, 10, msgGen);
    expect(fb.closeness).toBe('very_close');
  });

  test('closeness=close for medium range difference', () => {
    const fb = generateFeedback(55, 50, 1, 100, msgGen);
    expect(fb.closeness).toBe('close');
  });

  test('closeness=far for large difference', () => {
    const fb = generateFeedback(90, 50, 1, 100, msgGen);
    expect(fb.closeness).toBe('far');
  });

  test('handles range <= 50', () => {
    const fb = generateFeedback(48, 50, 1, 50, msgGen);
    expect(typeof fb.closeness).toBe('string');
  });

  test('handles range <= 500', () => {
    const fb = generateFeedback(490, 50, 1, 500, msgGen);
    expect(typeof fb.closeness).toBe('string');
  });

  test('handles range > 500 (threshold max branch)', () => {
    const fb = generateFeedback(990, 50, 1, 1000, msgGen);
    expect(typeof fb.closeness).toBe('string');
  });

  test('VERY_CLOSE_HIGH when high and within veryClose range', () => {
    // range=10 → veryCloseThreshold=1; guess=6, target=5 → diff=1 ≤ 1, high
    const fb = generateFeedback(6, 5, 1, 10, msgGen);
    expect(fb.message).toContain('VERY_CLOSE_HIGH');
  });

  test('VERY_CLOSE_LOW when low and within veryClose range', () => {
    const fb = generateFeedback(4, 5, 1, 10, msgGen);
    expect(fb.message).toContain('VERY_CLOSE_LOW');
  });

  test('CLOSE_HIGH when high and within close range', () => {
    // range=50 → veryCloseThreshold=2, closeThreshold=4; diff=3 → CLOSE_HIGH
    const fb = generateFeedback(53, 50, 1, 50, msgGen);
    expect(fb.message).toContain('CLOSE_HIGH');
  });

  test('CLOSE_LOW when low and within close range', () => {
    const fb = generateFeedback(47, 50, 1, 50, msgGen);
    expect(fb.message).toContain('CLOSE_LOW');
  });
});

// ─── calculateOptimalAttempts ─────────────────────────────────────────────────

describe('calculateOptimalAttempts', () => {
  test('returns ceil(log2(rangeSize))', () => {
    expect(calculateOptimalAttempts(1, 100)).toBe(7); // log2(100) ≈ 6.64 → ceil = 7
    expect(calculateOptimalAttempts(1, 10)).toBe(4); // log2(10) ≈ 3.32 → ceil = 4
  });
});

// ─── evaluatePerformance ──────────────────────────────────────────────────────

describe('evaluatePerformance', () => {
  test('legendary for 1 attempt', () => {
    const r = evaluatePerformance(1, 1, 100);
    expect(r.rating).toBe('legendary');
  });

  test('excellent for attempts <= optimal', () => {
    const r = evaluatePerformance(7, 1, 100);
    expect(r.rating).toBe('excellent');
  });

  test('good for attempts <= 1.5x optimal', () => {
    const r = evaluatePerformance(10, 1, 100);
    expect(r.rating).toBe('good');
  });

  test('fair for attempts <= 2x optimal', () => {
    const r = evaluatePerformance(14, 1, 100);
    expect(r.rating).toBe('fair');
  });

  test('needs_improvement for high attempts', () => {
    const r = evaluatePerformance(30, 1, 100);
    expect(r.rating).toBe('needs_improvement');
  });

  test('includes efficiency percentage', () => {
    const r = evaluatePerformance(7, 1, 100);
    expect(r.efficiency).toBe(100);
  });
});

// ─── getContextualFeedback ────────────────────────────────────────────────────

describe('getContextualFeedback', () => {
  const settings = { rangeStart: 1, rangeEnd: 100 };

  test('no previous guesses — no improvement field', () => {
    const fb = getContextualFeedback(60, 50, [], settings, msgGen);
    expect(fb).not.toHaveProperty('improvement');
  });

  test('improvement=better when closer than last guess', () => {
    const prev = [{ guess: 70 }]; // diff=20
    const fb = getContextualFeedback(55, 50, prev, settings, msgGen); // diff=5
    expect(fb.improvement).toBe('better');
  });

  test('improvement=worse when farther than last guess', () => {
    const prev = [{ guess: 55 }]; // diff=5
    const fb = getContextualFeedback(70, 50, prev, settings, msgGen); // diff=20
    expect(fb.improvement).toBe('worse');
  });

  test('improvement=same when same distance as last guess', () => {
    const prev = [{ guess: 45 }]; // diff=5 (50-45)
    const fb = getContextualFeedback(55, 50, prev, settings, msgGen); // diff=5 (55-50)
    expect(fb.improvement).toBe('same');
  });
});

// ─── Party phaseMethods: startGame ────────────────────────────────────────────

describe('Party phaseMethods: startGame', () => {
  test('starts successfully with 2 connected players', () => {
    const { party, host } = makeTwoPlayerParty();
    expect(party.startGame(host.id)).toBe(true);
    expect(party.gameState.phase).toBe('selection');
  });

  test('rejects non-host caller', () => {
    const { party, guest } = makeTwoPlayerParty();
    expect(() => party.startGame(guest.id)).toThrow('Only host can start the game');
  });

  test('rejects with only 1 player', () => {
    const host = makeConnectedPlayer('h', 'Host');
    const solo = new Party('SOLO01', host);
    expect(() => solo.startGame(host.id)).toThrow('Need exactly 2 players');
  });

  test('rejects when game already started', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    expect(() => party.startGame(host.id)).toThrow('Game already started');
  });

  test('rejects when a player is disconnected', () => {
    const { party, host, guest } = makeTwoPlayerParty();
    guest.isConnected = false;
    expect(() => party.startGame(host.id)).toThrow('not all players are connected');
  });
});

// ─── Party phaseMethods: startSelectionPhase ─────────────────────────────────

describe('Party phaseMethods: startSelectionPhase', () => {
  test('starts selection when already in selection phase', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id); // → selection phase
    expect(party.startSelectionPhase()).toBe(true);
  });

  test('rejects when not in selection phase', () => {
    const { party } = makeTwoPlayerParty();
    expect(() => party.startSelectionPhase()).toThrow('Invalid phase for selection');
  });
});

// ─── Party phaseMethods: setPlayerReady ──────────────────────────────────────

describe('Party phaseMethods: setPlayerReady', () => {
  test('marks player ready with valid secret number', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    expect(party.setPlayerReady(host.id, 42)).toBe(true);
    expect(party.gameState.playersReady.has(host.id)).toBe(true);
  });

  test('rejects unknown player', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    expect(() => party.setPlayerReady('unknown-id', 42)).toThrow('Player not found');
  });

  test('rejects when not in selection phase', () => {
    const { party, host } = makeTwoPlayerParty();
    expect(() => party.setPlayerReady(host.id, 42)).toThrow('Not in selection phase');
  });

  test('rejects out-of-range secret number', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    expect(() => party.setPlayerReady(host.id, 9999)).toThrow();
  });
});

// ─── Party phaseMethods: autoSelectNumbers ────────────────────────────────────

describe('Party phaseMethods: autoSelectNumbers', () => {
  test('assigns secret numbers for unready players', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    party.autoSelectNumbers();
    party.players.forEach((p) => {
      expect(p.secretNumber).not.toBeNull();
    });
  });
});

// ─── Party phaseMethods: startPlayingPhase ────────────────────────────────────

describe('Party phaseMethods: startPlayingPhase', () => {
  test('starts playing when all players are ready', () => {
    const { party, host, guest } = makeTwoPlayerParty();
    party.startGame(host.id);
    party.setPlayerReady(host.id, 42);
    party.setPlayerReady(guest.id, 77);
    expect(party.startPlayingPhase()).toBe(true);
    expect(party.gameState.phase).toBe('playing');
  });

  test('rejects when not all players ready', () => {
    const { party, host } = makeTwoPlayerParty();
    party.startGame(host.id);
    party.setPlayerReady(host.id, 42);
    // guest not ready
    expect(() => party.startPlayingPhase()).toThrow('Not all players are ready');
  });
});

// ─── Party phaseMethods: nextRound ────────────────────────────────────────────

describe('Party phaseMethods: nextRound', () => {
  test('rejects when not in results phase', () => {
    const { party } = makeTwoPlayerParty();
    expect(() => party.nextRound()).toThrow('Not in results phase');
  });
});

// ─── Party phaseMethods: rematch ──────────────────────────────────────────────

describe('Party phaseMethods: rematch', () => {
  test('resets game state for rematch', () => {
    const { party } = makeTwoPlayerParty();
    expect(party.rematch()).toBe(true);
    expect(party.gameState.phase).toBe('selection');
    expect(party.currentRound).toBe(1);
  });

  test('rejects with 1 player', () => {
    const host = makeConnectedPlayer('h', 'Host');
    const solo = new Party('SOLO02', host);
    expect(() => solo.rematch()).toThrow('Need 2 players');
  });

  test('rejects when a player is disconnected', () => {
    const { party, guest } = makeTwoPlayerParty();
    guest.isConnected = false;
    expect(() => party.rematch()).toThrow('not all players are connected');
  });
});

// ─── PartyService session / metrics methods ───────────────────────────────────

describe('PartyService session methods', () => {
  let svc;

  beforeEach(() => {
    svc = new PartyService();
  });

  test('getPartyBySocket returns null for unknown socket', async () => {
    const result = await svc.getPartyBySocket('unknown-sock');
    expect(result).toBeNull();
  });

  test('getParty returns null for unknown code', async () => {
    const result = await svc.getParty('XXXXXX');
    expect(result).toBeNull();
  });

  test('getParty returns null for falsy input', async () => {
    expect(await svc.getParty(null)).toBeNull();
    expect(await svc.getParty('')).toBeNull();
  });

  test('getPartyContextBySocket returns null for unknown socket', async () => {
    expect(await svc.getPartyContextBySocket('no-such-socket')).toBeNull();
  });

  test('getPlayerBySocket returns null for unknown socket', async () => {
    expect(await svc.getPlayerBySocket('no-such-socket')).toBeNull();
  });

  test('isSocketInParty returns false for unknown socket', async () => {
    expect(await svc.isSocketInParty('no-such-socket')).toBe(false);
  });

  test('cleanupDisconnectedPlayer returns null for unknown socket', async () => {
    expect(await svc.cleanupDisconnectedPlayer('no-such-socket')).toBeNull();
  });

  test('reconnectPlayer returns error for unknown party', async () => {
    const result = await svc.reconnectPlayer('sock', 'NOEXST', 'pid', 'secret');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

describe('PartyService metrics methods', () => {
  let svc;

  beforeEach(() => {
    svc = new PartyService();
  });

  test('getActivePartiesCount is 0 for empty service', async () => {
    expect(await svc.getActivePartiesCount()).toBe(0);
  });

  test('getActivePlayersCount is 0 for empty service', async () => {
    expect(await svc.getActivePlayersCount()).toBe(0);
  });

  test('getTotalPartiesCreated starts at 0', () => {
    expect(svc.getTotalPartiesCreated()).toBe(0);
  });

  test('getTotalPlayersCount starts at 0', () => {
    expect(svc.getTotalPlayersCount()).toBe(0);
  });

  test('getGamesCompletedCount starts at 0', () => {
    expect(svc.getGamesCompletedCount()).toBe(0);
  });

  test('recordGameCompletion increments the counter', () => {
    svc.recordGameCompletion();
    expect(svc.getGamesCompletedCount()).toBe(1);
  });

  test('getStats returns expected shape', async () => {
    const stats = await svc.getStats();
    expect(stats).toHaveProperty('activeParties');
    expect(stats).toHaveProperty('gamesCompleted');
  });

  test('getAllParties returns empty array initially', async () => {
    const parties = await svc.getAllParties();
    expect(Array.isArray(parties)).toBe(true);
    expect(parties).toHaveLength(0);
  });

  test('cleanupInactiveParties returns 0 when nothing to clean', async () => {
    const count = await svc.cleanupInactiveParties();
    expect(count).toBe(0);
  });

  test('getSystemHealth returns healthy:true', async () => {
    const health = await svc.getSystemHealth();
    expect(health.healthy).toBe(true);
  });

  test('getPartyDetails returns null for unknown code', async () => {
    const result = await svc.getPartyDetails('XXXXXX');
    expect(result).toBeNull();
  });

  test('broadcastToParty returns false for unknown party', async () => {
    const result = await svc.broadcastToParty(
      'XXXXXX',
      'event',
      {},
      { to: () => ({ emit: () => {} }) }
    );
    expect(result).toBe(false);
  });

  test('sendToPlayer returns false for unknown playerId', async () => {
    const result = await svc.sendToPlayer('no-id', 'event', {}, { to: () => ({ emit: () => {} }) });
    expect(result).toBe(false);
  });

  test('validatePartyCode delegates to config-length check', () => {
    const r = svc.validatePartyCode('ABC123');
    expect(r.valid).toBe(true);
  });

  test('validatePlayerName delegates to name rules', () => {
    const r = svc.validatePlayerName('Alice');
    expect(r.valid).toBe(true);
  });

  test('emergencyCleanup returns zero counts', async () => {
    const result = await svc.emergencyCleanup();
    expect(result.partiesRemoved).toBe(0);
    expect(result.playersRemoved).toBe(0);
  });
});
