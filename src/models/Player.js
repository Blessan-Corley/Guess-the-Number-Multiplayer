const { v4: uuidv4 } = require('uuid');
const { generateSecret, hashSecret, secretsMatch } = require('../lib/security');

class Player {
  constructor(socketId, name, profileId = null) {
    this.id = uuidv4();
    this.socketId = socketId;
    this.name = name.trim().substring(0, 20);
    this.profileId = profileId;
    this.isHost = false;
    this.isConnected = true;
    this.isReady = false;
    this.secretNumber = null;
    this.attempts = 0;
    this.wins = 0;
    this.guessHistory = [];
    this.lastActivity = Date.now();
    this.joinedAt = Date.now();
    this.hasFinished = false;
    this.finishedAt = null;
    this.wantsRematch = false;
    this.gameAttempts = 0;
    this.reconnectSecretHash = null;
    this._sessionBaseGames = 0;
    this.stats = {
      totalGames: 0,
      totalWins: 0,
      totalAttempts: 0,
      bestScore: null,
      averageAttempts: 0,
    };
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  setReady(secretNumber = null) {
    this.isReady = true;
    if (secretNumber !== null) {
      this.secretNumber = secretNumber;
    }
    this.updateActivity();
  }

  resetForNewRound() {
    this.isReady = false;
    this.secretNumber = null;
    this.attempts = 0;
    this.guessHistory = [];
    this.hasFinished = false;
    this.finishedAt = null;
    this.wantsRematch = false;
    this.updateActivity();
  }

  resetForNewGame() {
    this.resetForNewRound();
    this.gameAttempts = 0;
  }

  resetForNewSession() {
    this.resetForNewRound();
    this.wins = 0;
    this.gameAttempts = 0;
    this._sessionBaseGames = this.stats.totalGames;
  }

  makeGuess(guess, targetNumber) {
    this.attempts++;
    this.gameAttempts++;
    this.stats.totalAttempts++;

    const isCorrect = guess === targetNumber;
    const difference = Math.abs(guess - targetNumber);

    const guessResult = {
      attempt: this.attempts,
      guess,
      target: targetNumber,
      isCorrect,
      difference,
      timestamp: Date.now(),
    };

    this.guessHistory.push(guessResult);
    this.updateActivity();

    if (isCorrect) {
      this.hasFinished = true;
      this.finishedAt = Date.now();
    }

    return guessResult;
  }

  recordWin() {
    this.wins++;
    this.stats.totalWins++;
    this.stats.totalGames++;

    if (this.stats.bestScore === null || this.attempts < this.stats.bestScore) {
      this.stats.bestScore = this.attempts;
    }

    this.updateStats();
  }

  recordLoss() {
    this.stats.totalGames++;
    this.updateStats();
  }

  updateStats() {
    if (this.stats.totalGames > 0) {
      this.stats.averageAttempts =
        Math.round((this.stats.totalAttempts / this.stats.totalGames) * 100) / 100;
    }
  }

  setConnected(connected) {
    this.isConnected = connected;
    if (connected) {
      this.updateActivity();
    }
  }

  updateSocketId(newSocketId) {
    this.socketId = newSocketId;
    this.setConnected(true);
  }

  issueReconnectSecret() {
    const reconnectSecret = generateSecret();
    this.reconnectSecretHash = hashSecret(reconnectSecret);
    return reconnectSecret;
  }

  verifyReconnectSecret(reconnectSecret) {
    return secretsMatch(reconnectSecret, this.reconnectSecretHash);
  }

  isInactive(timeoutMs = 600000) {
    return Date.now() - this.lastActivity > timeoutMs;
  }

  getPublicInfo() {
    return {
      id: this.id,
      name: this.name,
      isHost: this.isHost,
      isConnected: this.isConnected,
      isReady: this.isReady,
      attempts: this.attempts,
      wins: this.wins,
      joinedAt: this.joinedAt,
      stats: {
        totalGames: this.stats.totalGames,
        totalWins: this.stats.totalWins,
        bestScore: this.stats.bestScore,
        averageAttempts: this.stats.averageAttempts,
      },
    };
  }

  getPrivateInfo() {
    return {
      ...this.getPublicInfo(),
      secretNumber: this.secretNumber,
      guessHistory: this.guessHistory,
      lastActivity: this.lastActivity,
      gameAttempts: this.gameAttempts,
      hasFinished: this.hasFinished,
      stats: this.stats,
    };
  }

  validateSecretNumber(number, rangeStart, rangeEnd) {
    if (typeof number !== 'number' || Number.isNaN(number)) {
      return { valid: false, error: 'Secret number must be a valid number' };
    }

    if (!Number.isInteger(number)) {
      return { valid: false, error: 'Secret number must be a whole number' };
    }

    if (number < rangeStart || number > rangeEnd) {
      return {
        valid: false,
        error: `Secret number must be between ${rangeStart} and ${rangeEnd}`,
      };
    }

    return { valid: true };
  }

  validateGuess(guess, rangeStart, rangeEnd) {
    if (typeof guess !== 'number' || Number.isNaN(guess)) {
      return { valid: false, error: 'Guess must be a valid number' };
    }

    if (!Number.isInteger(guess)) {
      return { valid: false, error: 'Guess must be a whole number' };
    }

    if (guess < rangeStart || guess > rangeEnd) {
      return {
        valid: false,
        error: `Guess must be between ${rangeStart} and ${rangeEnd}`,
      };
    }

    return { valid: true };
  }

  getSessionPerformance() {
    const sessionGames = this.stats.totalGames - (this._sessionBaseGames || 0);
    const sessionWins = this.wins;
    const winRate = sessionGames > 0 ? ((sessionWins / sessionGames) * 100).toFixed(1) : 0;

    return {
      gamesPlayed: sessionGames,
      wins: sessionWins,
      winRate: parseFloat(winRate),
      currentAttempts: this.attempts,
      bestScore: this.stats.bestScore,
      averageAttempts: this.stats.averageAttempts,
    };
  }

  toJSON() {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      profileId: this.profileId,
      isHost: this.isHost,
      isConnected: this.isConnected,
      isReady: this.isReady,
      secretNumber: this.secretNumber,
      attempts: this.attempts,
      wins: this.wins,
      guessHistory: this.guessHistory,
      lastActivity: this.lastActivity,
      joinedAt: this.joinedAt,
      hasFinished: this.hasFinished,
      finishedAt: this.finishedAt,
      wantsRematch: this.wantsRematch,
      gameAttempts: this.gameAttempts,
      reconnectSecretHash: this.reconnectSecretHash,
      stats: this.stats,
      _sessionBaseGames: this._sessionBaseGames,
    };
  }

  static fromJSON(data) {
    const player = new Player(data.socketId, data.name);
    const ALLOWED_KEYS = [
      'id',
      'socketId',
      'name',
      'profileId',
      'isHost',
      'isConnected',
      'isReady',
      'secretNumber',
      'attempts',
      'wins',
      'guessHistory',
      'lastActivity',
      'joinedAt',
      'hasFinished',
      'finishedAt',
      'wantsRematch',
      'gameAttempts',
      'reconnectSecretHash',
      'stats',
      '_sessionBaseGames',
    ];
    ALLOWED_KEYS.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        player[key] = data[key];
      }
    });
    return player;
  }
}

module.exports = Player;
