(function registerSinglePlayerBotLogic(global) {
  const SinglePlayerGameClass =
    global.SinglePlayerGame || (typeof SinglePlayerGame !== 'undefined' ? SinglePlayerGame : null);
  if (!SinglePlayerGameClass) {
    return;
  }

  Object.assign(SinglePlayerGameClass.prototype, {
    botMakeGuess() {
      if (this.gameState.gamePhase !== 'playing') {
        return;
      }

      this.gameState.botAttempts++;

      let botGuess;
      switch (this.gameState.botDifficulty) {
        case 'easy':
          botGuess = this.botEasyStrategy();
          break;
        case 'medium':
          botGuess = this.botMediumStrategy();
          break;
        case 'hard':
          botGuess = this.botHardStrategy();
          break;
        default:
          botGuess = this.botMediumStrategy();
          break;
      }

      const isCorrect = botGuess === this.gameState.playerSecretNumber;

      this.gameState.botGuessHistory.push({
        attempt: this.gameState.botAttempts,
        guess: botGuess,
        isCorrect,
      });

      document.getElementById('opponentAttempts').textContent = this.gameState.botAttempts;

      const botMessage = isCorrect
        ? `Bot found your number ${this.gameState.playerSecretNumber} in ${this.gameState.botAttempts} attempts!`
        : `Bot guessed ${botGuess} (Attempt ${this.gameState.botAttempts})`;

      UI.showNotification(botMessage, isCorrect ? 'warning' : 'info');

      if (isCorrect) {
        this.endGame('bot');
      } else {
        this.updateBotStrategy(botGuess, this.gameState.playerSecretNumber);
      }
    },

    botEasyStrategy() {
      return this.generateRandomNumber(this.gameState.rangeStart, this.gameState.rangeEnd);
    },

    botMediumStrategy() {
      const { min, max } = this.gameState.botStrategy;
      const range = max - min + 1;

      if (range <= 1) {
        return min;
      }

      const mid = Math.floor((min + max) / 2);
      const randomOffset = Math.floor(Math.random() * Math.min(3, range)) - 1;
      return Math.max(min, Math.min(max, mid + randomOffset));
    },

    botHardStrategy() {
      const { min, max } = this.gameState.botStrategy;
      return Math.floor((min + max) / 2);
    },

    updateBotStrategy(guess, target) {
      if (guess < target) {
        this.gameState.botStrategy.min = guess + 1;
      } else if (guess > target) {
        this.gameState.botStrategy.max = guess - 1;
      }
      this.gameState.botStrategy.lastGuess = guess;
    },

    initializeBotStrategy() {
      this.gameState.botStrategy = {
        min: this.gameState.rangeStart,
        max: this.gameState.rangeEnd,
        lastGuess: null,
        strategy: 'binary',
      };
    },

    generateFeedback(guess, target) {
      if (guess === target) {
        return {
          type: 'success',
          message: 'Correct! You found the bot number.',
          isCorrect: true,
        };
      }

      const difference = Math.abs(guess - target);
      const range = this.gameState.rangeEnd - this.gameState.rangeStart + 1;

      let veryCloseThreshold;
      let closeThreshold;

      if (range <= 20) {
        veryCloseThreshold = 1;
        closeThreshold = 2;
      } else if (range <= 50) {
        veryCloseThreshold = 2;
        closeThreshold = 4;
      } else if (range <= 100) {
        veryCloseThreshold = 3;
        closeThreshold = 8;
      } else if (range <= 500) {
        veryCloseThreshold = Math.max(5, Math.ceil(range * 0.015));
        closeThreshold = Math.max(10, Math.ceil(range * 0.04));
      } else {
        veryCloseThreshold = Math.max(8, Math.ceil(range * 0.012));
        closeThreshold = Math.max(20, Math.ceil(range * 0.035));
      }

      let messageType;
      let messageKey;

      if (difference <= veryCloseThreshold) {
        messageType = 'warning';
        messageKey = guess > target ? 'VERY_CLOSE_HIGH' : 'VERY_CLOSE_LOW';
      } else if (difference <= closeThreshold) {
        messageType = 'warning';
        messageKey = guess > target ? 'CLOSE_HIGH' : 'CLOSE_LOW';
      } else {
        messageType = 'info';
        messageKey = guess > target ? 'TOO_HIGH' : 'TOO_LOW';
      }

      return {
        type: messageType,
        message: this.getRandomMessage(messageKey),
        isCorrect: false,
        difference,
        direction: guess > target ? 'high' : 'low',
        closeness:
          difference <= veryCloseThreshold
            ? 'very_close'
            : difference <= closeThreshold
              ? 'close'
              : 'far',
      };
    },

    getRandomMessage(category) {
      if (!this.config || !this.config.GAME_MESSAGES) {
        return 'Too high/low';
      }
      const messages = this.config.GAME_MESSAGES[category];
      if (!messages || !messages.length) {
        return 'Keep trying';
      }
      return messages[Math.floor(Math.random() * messages.length)];
    },

    generateRandomNumber(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    endGame(winner) {
      this.gameState.gamePhase = 'finished';

      if (winner === 'player') {
        this.gameState.playerWins++;
      } else {
        this.gameState.botWins++;
      }

      this.saveStats();
      this.showSinglePlayerResults(winner);
    },
  });
})(window);
