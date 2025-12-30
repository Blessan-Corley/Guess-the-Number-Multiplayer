const GameService = require('../../src/services/GameService');
const PartyService = require('../../src/services/PartyService');
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
                'TOO_HIGH', 'TOO_LOW', 
                'CLOSE_HIGH', 'CLOSE_LOW', 
                'VERY_CLOSE_HIGH', 'VERY_CLOSE_LOW'
            ];
            requiredCategories.forEach(category => {
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
