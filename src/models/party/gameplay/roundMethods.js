module.exports = {
  makeGuess(playerId, guess) {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.gameState.phase !== 'playing') {
      throw new Error('Not in playing phase');
    }

    if (player.hasFinished) {
      throw new Error('You have already found the number');
    }

    const validation = player.validateGuess(
      guess,
      this.gameSettings.rangeStart,
      this.gameSettings.rangeEnd
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const opponent = Array.from(this.players.values()).find((entry) => entry.id !== playerId);

    if (!opponent) {
      throw new Error('Opponent not found');
    }

    const guessResult = player.makeGuess(guess, opponent.secretNumber);
    this.stats.totalGuesses++;

    this.updateActivity();
    this._incrementStateVersion();

    return guessResult;
  },

  endRound(winnerId) {
    if (this.gameState.phase !== 'playing') {
      throw new Error('Not in playing phase');
    }

    const winner = this.getPlayer(winnerId);
    if (!winner) {
      throw new Error('Winner not found');
    }

    const roundDuration = Date.now() - (this.gameState.roundStartTime || Date.now());
    this.stats.roundDurations.push(roundDuration);

    if (this.stats.roundDurations.length > 0) {
      this.stats.averageRoundDuration = Math.floor(
        this.stats.roundDurations.reduce((a, b) => a + b, 0) / this.stats.roundDurations.length
      );
    }

    const roundResult = {
      round: this.currentRound,
      winnerId,
      winnerName: winner.name,
      winnerAttempts: winner.attempts,
      timestamp: Date.now(),
      duration: roundDuration,
      players: Array.from(this.players.values()).map((player) => ({
        id: player.id,
        name: player.name,
        attempts: player.attempts,
        secretNumber: player.secretNumber,
      })),
    };

    this.gameState.roundResults.push(roundResult);
    this.gameState.winnerId = winnerId;

    winner.recordWin();
    this.players.forEach((player) => {
      if (player.id !== winnerId) {
        player.recordLoss();
      }
    });

    this.stats.totalRounds++;
    this.gameState.phase = 'results';

    this.updateActivity();
    this._incrementStateVersion();

    const isGameComplete = this.isGameComplete();
    if (isGameComplete) {
      this.endGame();
    }

    return {
      roundResult,
      isGameComplete,
      gameWinner: isGameComplete ? this.getGameWinner() : null,
    };
  },

  isGameComplete() {
    return this.currentRound >= this.maxRounds;
  },

  getGameWinner() {
    const winCounts = new Map();
    this.gameState.roundResults.forEach((result) => {
      winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
    });

    let maxWins = 0;
    let winnerId = null;

    winCounts.forEach((wins, playerId) => {
      if (wins > maxWins) {
        maxWins = wins;
        winnerId = playerId;
      }
    });

    return winnerId ? this.getPlayer(winnerId) : null;
  },

  endGame() {
    this.gameState.phase = 'finished';
    this.status = 'finished';
    this.stats.gamesCompleted++;

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },
};
