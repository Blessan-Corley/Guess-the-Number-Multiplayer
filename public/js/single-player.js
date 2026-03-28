class SinglePlayerGame {
  constructor() {
    this.gameState = this.createInitialGameState();
    this.botThinkingTime = {
      easy: 2000,
      medium: 1500,
      hard: 1000,
    };

    this.config = null;
    this.loadConfig();
    this.loadStats();
  }

  createInitialGameState() {
    return {
      playerName: '',
      playerSecretNumber: null,
      botSecretNumber: null,
      playerAttempts: 0,
      botAttempts: 0,
      playerWins: 0,
      botWins: 0,
      rangeStart: 1,
      rangeEnd: 100,
      botDifficulty: 'medium',
      gamePhase: 'setup',
      playerGuessHistory: [],
      botGuessHistory: [],
      botStrategy: {
        min: 1,
        max: 100,
        lastGuess: null,
        strategy: 'binary',
      },
    };
  }

  loadStats() {
    try {
      const savedStats = localStorage.getItem('numberGuesserSinglePlayerStats');
      if (savedStats) {
        const stats = JSON.parse(savedStats);
        this.gameState.playerWins = stats.playerWins || 0;
        this.gameState.botWins = stats.botWins || 0;
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }

  saveStats() {
    try {
      const stats = {
        playerWins: this.gameState.playerWins,
        botWins: this.gameState.botWins,
      };
      localStorage.setItem('numberGuesserSinglePlayerStats', JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to save stats:', e);
    }
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        this.config = await response.json();
      } else {
        this.useDefaultConfig();
      }
    } catch (error) {
      this.useDefaultConfig();
    }
  }

  useDefaultConfig() {
    this.config = {
      GAME_MESSAGES: {
        TOO_HIGH: ['Too high!'],
        TOO_LOW: ['Too low!'],
        CLOSE_HIGH: ['Close, but high!'],
        CLOSE_LOW: ['Close, but low!'],
        VERY_CLOSE_HIGH: ['Very close, just a bit high!'],
        VERY_CLOSE_LOW: ['Very close, just a bit low!'],
      },
    };
  }

  startGame(playerName, rangeStart, rangeEnd, botDifficulty) {
    if (!this.config) {
      UI.showNotification('Game configuration not loaded yet. Please wait...', 'error');
      return;
    }

    if (typeof Game !== 'undefined' && Game.currentState) {
      Game.currentState.gameMode = 'single';
      Game.currentState.party = null;
      Game.currentState.hasFinished = false;
    }
    if (typeof window !== 'undefined' && window.AppActions) {
      window.AppActions.setMode('single');
      window.AppActions.setSinglePlayerBounds({ rangeStart, rangeEnd });
      window.AppActions.setFinished(false);
    }

    this.gameState.playerName = playerName;
    this.gameState.rangeStart = rangeStart;
    this.gameState.rangeEnd = rangeEnd;
    this.gameState.botDifficulty = botDifficulty;
    this.gameState.gamePhase = 'selection';

    this.gameState.playerSecretNumber = null;
    this.gameState.botSecretNumber = this.generateRandomNumber(rangeStart, rangeEnd);
    this.initializeBotStrategy();

    this.gameState.playerAttempts = 0;
    this.gameState.botAttempts = 0;
    this.gameState.playerGuessHistory = [];
    this.gameState.botGuessHistory = [];

    this.showSinglePlayerSelection();
  }

  makePlayerGuess(guess) {
    if (this.gameState.gamePhase !== 'playing') {
      return;
    }

    if (guess < this.gameState.rangeStart || guess > this.gameState.rangeEnd) {
      UI.showNotification(
        `Guess must be between ${this.gameState.rangeStart} and ${this.gameState.rangeEnd}`,
        'error'
      );
      return;
    }

    this.gameState.playerAttempts++;
    const feedback = this.generateFeedback(guess, this.gameState.botSecretNumber);

    this.gameState.playerGuessHistory.push({
      attempt: this.gameState.playerAttempts,
      guess,
      feedback,
    });

    document.getElementById('myAttempts').textContent = this.gameState.playerAttempts;
    UI.showGameMessage(feedback.message, feedback.type);
    UI.addGuessToHistory(guess, {
      attempts: this.gameState.playerAttempts,
      isCorrect: feedback.isCorrect,
      closeness: feedback.closeness,
      direction: feedback.direction,
    });

    if (feedback.isCorrect) {
      this.endGame('player');
      return;
    }

    setTimeout(() => {
      this.botMakeGuess();
    }, this.botThinkingTime[this.gameState.botDifficulty]);
  }

  getGameState() {
    return { ...this.gameState };
  }
}

window.SinglePlayerGame = SinglePlayerGame;
const singlePlayerGame = new SinglePlayerGame();
window.singlePlayerGame = singlePlayerGame;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SinglePlayerGame;
}
