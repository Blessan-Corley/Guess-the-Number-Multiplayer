const GameService = require('../../src/services/GameService');
const PartyService = require('../../src/services/PartyService');
const Player = require('../../src/models/Player');
const config = require('../../config/config');

describe('GameService & Logic Validation', () => {
  let gameService;
  let partyService;

  beforeEach(() => {
    partyService = new PartyService();
    gameService = new GameService(partyService);
  });

  describe('Configuration Integrity', () => {
    test('Shared configuration should be loaded correctly', () => {
      expect(config.DEFAULT_RANGE_START).toBeDefined();
      expect(config.DEFAULT_RANGE_END).toBeDefined();
      expect(config.GAME_MESSAGES).toBeDefined();
    });

    test('Game messages should have required categories', () => {
      const requiredCategories = [
        'TOO_HIGH',
        'TOO_LOW',
        'CLOSE_HIGH',
        'CLOSE_LOW',
        'VERY_CLOSE_HIGH',
        'VERY_CLOSE_LOW',
      ];
      requiredCategories.forEach((category) => {
        expect(config.GAME_MESSAGES[category]).toBeDefined();
        expect(Array.isArray(config.GAME_MESSAGES[category])).toBe(true);
        expect(config.GAME_MESSAGES[category].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Feedback Generation', () => {
    test('Should identify correct guess', () => {
      const feedback = gameService.generateFeedback(42, 42, 1, 100);
      expect(feedback.isCorrect).toBe(true);
      expect(feedback.type).toBe('success');
    });

    test('Should identify too high guess', () => {
      // Range 1-100, Target 50, Guess 90 (Diff 40)
      const feedback = gameService.generateFeedback(90, 50, 1, 100);
      expect(feedback.isCorrect).toBe(false);
      expect(feedback.direction).toBe('high');
      expect(feedback.type).toBe('info'); // "far"
    });

    test('Should identify close guess', () => {
      // Range 1-100, Target 50, Guess 55 (Diff 5)
      // Thresholds for 100 range: VeryClose=3, Close=8
      const feedback = gameService.generateFeedback(55, 50, 1, 100);
      expect(feedback.isCorrect).toBe(false);
      expect(feedback.closeness).toBe('close');
      expect(feedback.type).toBe('warning');
    });

    test('Should identify very close guess', () => {
      // Range 1-100, Target 50, Guess 51 (Diff 1)
      const feedback = gameService.generateFeedback(51, 50, 1, 100);
      expect(feedback.isCorrect).toBe(false);
      expect(feedback.closeness).toBe('very_close');
    });
  });

  describe('Player deserialization safety', () => {
    test('fromJSON should not copy arbitrary injected fields', () => {
      const data = {
        socketId: 'sock1',
        name: 'Alice',
        id: 'player-uuid-1',
        isHost: false,
        isConnected: true,
        isReady: false,
        secretNumber: null,
        attempts: 0,
        wins: 0,
        guessHistory: [],
        lastActivity: Date.now(),
        joinedAt: Date.now(),
        hasFinished: false,
        finishedAt: null,
        wantsRematch: false,
        gameAttempts: 0,
        reconnectSecretHash: null,
        stats: {
          totalGames: 0,
          totalWins: 0,
          totalAttempts: 0,
          bestScore: null,
          averageAttempts: 0,
        },
        profileId: null,
        _sessionBaseGames: 0,
        extraField: 'evil-injected-value',
        anotherField: 12345,
      };
      const player = Player.fromJSON(data);
      expect(player.extraField).toBeUndefined();
      expect(player.anotherField).toBeUndefined();
    });

    test('fromJSON should correctly restore all legitimate fields', () => {
      const original = new Player('sock1', 'Alice');
      original.isHost = true;
      original.attempts = 5;
      original.wins = 2;
      original.stats.totalGames = 3;
      original.stats.totalWins = 2;
      const json = original.toJSON();
      const restored = Player.fromJSON(json);
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.isHost).toBe(true);
      expect(restored.attempts).toBe(5);
      expect(restored.wins).toBe(2);
      expect(restored.stats.totalGames).toBe(3);
    });
  });

  describe('Player.getSessionPerformance', () => {
    test('gamesPlayed reflects only current-session games', () => {
      const player = new Player('sock1', 'Alice');
      // Simulate 3 lifetime games before session reset
      player.stats.totalGames = 3;
      player.stats.totalWins = 2;
      // Session reset: snapshots the baseline
      player.resetForNewSession();
      expect(player._sessionBaseGames).toBe(3);
      // Play 1 new game this session
      player.stats.totalGames = 4;
      player.wins = 1;
      const perf = player.getSessionPerformance();
      expect(perf.gamesPlayed).toBe(1);
      expect(perf.wins).toBe(1);
    });

    test('winRate is 0 when no games played this session', () => {
      const player = new Player('sock1', 'Bob');
      const perf = player.getSessionPerformance();
      expect(perf.gamesPlayed).toBe(0);
      expect(perf.winRate).toBe(0);
    });
  });

  describe('Difficulty Calculation', () => {
    test('Should calculate optimal attempts correctly', () => {
      // Log2(100) is approx 6.64 -> ceil is 7
      expect(gameService.calculateOptimalAttempts(1, 100)).toBe(7);
      // Log2(1000) is approx 9.96 -> ceil is 10
      expect(gameService.calculateOptimalAttempts(1, 1000)).toBe(10);
    });

    test('Should evaluate performance correctly', () => {
      const perf = gameService.evaluatePerformance(1, 1, 100);
      expect(perf.rating).toBe('legendary'); // First try

      const optimal = gameService.calculateOptimalAttempts(1, 100);
      const goodPerf = gameService.evaluatePerformance(optimal, 1, 100);
      expect(goodPerf.rating).toBe('excellent');
    });
  });
});
