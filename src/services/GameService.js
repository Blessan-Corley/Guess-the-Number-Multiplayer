const messageGenerator = require('../utils/messageGenerator');
const {
  generateFeedback,
  calculateOptimalAttempts,
  evaluatePerformance,
  getContextualFeedback,
} = require('./game/feedback');
const {
  generateRoundSummary,
  getOverallPerformanceRating,
  calculateAchievements,
  generateGameSummary,
  processGameEnd,
  getGameStatistics,
  predictOutcome,
  suggestNextGameRange,
} = require('./game/summary');
const {
  getStrategicHint,
  calculateDifficulty,
  getMotivationalMessage,
} = require('./game/guidance');

class GameService {
  constructor(partyService) {
    this.partyService = partyService;
  }

  generateFeedback(guess, target, rangeStart, rangeEnd) {
    return generateFeedback(guess, target, rangeStart, rangeEnd, messageGenerator);
  }

  calculateOptimalAttempts(rangeStart, rangeEnd) {
    return calculateOptimalAttempts(rangeStart, rangeEnd);
  }

  evaluatePerformance(attempts, rangeStart, rangeEnd) {
    return evaluatePerformance(attempts, rangeStart, rangeEnd);
  }

  generateRoundSummary(roundResult, gameSettings) {
    return generateRoundSummary(
      roundResult,
      gameSettings,
      (attempts, start, end) => this.evaluatePerformance(attempts, start, end),
      (start, end) => this.calculateOptimalAttempts(start, end)
    );
  }

  generateGameSummary(party) {
    return generateGameSummary(party, {
      generateRoundSummary: (roundResult, settings) =>
        this.generateRoundSummary(roundResult, settings),
      getOverallPerformanceRating: (player, gameSettings) =>
        this.getOverallPerformanceRating(player, gameSettings),
      calculateAchievements: (players, targetParty) =>
        this.calculateAchievements(players, targetParty),
    });
  }

  getOverallPerformanceRating(player, gameSettings) {
    return getOverallPerformanceRating(player, gameSettings, (start, end) =>
      this.calculateOptimalAttempts(start, end)
    );
  }

  calculateAchievements(players, party) {
    return calculateAchievements(players, party);
  }

  validateMove(party, playerId, guess) {
    const player = party.getPlayer(playerId);
    if (!player) {
      return { valid: false, error: 'Player not found' };
    }

    if (party.gameState.phase !== 'playing') {
      return { valid: false, error: 'Game is not in playing phase' };
    }

    return player.validateGuess(guess, party.gameSettings.rangeStart, party.gameSettings.rangeEnd);
  }

  getStrategicHint(player, targetNumber, gameSettings) {
    return getStrategicHint(player, targetNumber, gameSettings);
  }

  calculateDifficulty(rangeStart, rangeEnd) {
    return calculateDifficulty(rangeStart, rangeEnd, (start, end) =>
      this.calculateOptimalAttempts(start, end)
    );
  }

  getMotivationalMessage(player, context = 'general') {
    return getMotivationalMessage(player, context);
  }

  processGameEnd(party) {
    return processGameEnd(party, (targetParty) => this.generateGameSummary(targetParty));
  }

  getGameStatistics(party) {
    return getGameStatistics(party, (start, end) => this.calculateDifficulty(start, end));
  }

  predictOutcome(party) {
    return predictOutcome(party);
  }

  getContextualFeedback(guess, target, previousGuesses, gameSettings) {
    return getContextualFeedback(guess, target, previousGuesses, gameSettings, messageGenerator);
  }

  suggestNextGameRange(party) {
    return suggestNextGameRange(party);
  }
}

module.exports = GameService;
