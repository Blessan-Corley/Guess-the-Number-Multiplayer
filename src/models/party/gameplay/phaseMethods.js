const crypto = require('crypto');

// Returns a cryptographically random integer in [min, max] inclusive.
function cryptoRandInt(min, max) {
  const range = max - min + 1;
  // Use rejection sampling to avoid modulo bias.
  const bytesNeeded = Math.ceil(Math.log2(range) / 8) || 1;
  const maxUnbiased = Math.floor(256 ** bytesNeeded / range) * range;
  let value;
  do {
    const buf = crypto.randomBytes(bytesNeeded);
    value = buf.readUIntBE(0, bytesNeeded);
  } while (value >= maxUnbiased);
  return min + (value % range);
}

module.exports = {
  startGame(hostId) {
    if (hostId !== this.hostId) {
      throw new Error('Only host can start the game');
    }

    if (this.players.size < 2) {
      throw new Error('Need exactly 2 players to start');
    }

    if (this.gameState.phase !== 'lobby') {
      throw new Error('Game already started');
    }

    const disconnectedPlayers = Array.from(this.players.values()).filter(
      (player) => !player.isConnected
    );
    if (disconnectedPlayers.length > 0) {
      throw new Error('Cannot start - not all players are connected');
    }

    this.players.forEach((player) => {
      player.resetForNewGame();
    });

    this.currentRound = 1;
    this.gameState.phase = 'selection';
    this.gameState.roundResults = [];
    this.gameState.playersReady.clear();
    this.gameState.roundStartTime = Date.now();
    this.gameState.matchStartedAt = Date.now();
    this.status = 'selecting';

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  startSelectionPhase() {
    if (this.gameState.phase !== 'selection') {
      throw new Error('Invalid phase for selection');
    }

    this.players.forEach((player) => {
      player.resetForNewRound();
    });

    this.gameState.playersReady.clear();
    this.gameState.roundStartTime = Date.now();
    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  setPlayerReady(playerId, secretNumber) {
    const player = this.getPlayer(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (this.gameState.phase !== 'selection') {
      throw new Error('Not in selection phase');
    }

    const validation = player.validateSecretNumber(
      secretNumber,
      this.gameSettings.rangeStart,
      this.gameSettings.rangeEnd
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    player.setReady(secretNumber);
    this.gameState.playersReady.add(playerId);
    this.updateActivity();
    this._incrementStateVersion();

    return true;
  },

  autoSelectNumbers() {
    this.players.forEach((player) => {
      if (!player.isReady) {
        const randomNumber = cryptoRandInt(
          this.gameSettings.rangeStart,
          this.gameSettings.rangeEnd
        );
        player.setReady(randomNumber);
        this.gameState.playersReady.add(player.id);
      }
    });

    this._incrementStateVersion();
  },

  startPlayingPhase() {
    if (!this.allPlayersReady()) {
      throw new Error('Not all players are ready');
    }

    this.gameState.phase = 'playing';
    this.gameState.roundStartTime = Date.now();
    this.status = 'playing';

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  nextRound() {
    if (this.gameState.phase !== 'results') {
      throw new Error('Not in results phase');
    }

    if (this.isGameComplete()) {
      throw new Error('Game is already complete');
    }

    this.currentRound++;
    this.gameState.phase = 'selection';
    this.gameState.playersReady.clear();
    this.gameState.roundStartTime = null;
    this.status = 'selecting';

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  rematch() {
    if (this.players.size < 2) {
      throw new Error('Need 2 players for rematch');
    }

    const disconnectedPlayers = Array.from(this.players.values()).filter(
      (player) => !player.isConnected
    );
    if (disconnectedPlayers.length > 0) {
      throw new Error('Cannot rematch - not all players are connected');
    }

    this.currentRound = 1;
    this.gameState = {
      phase: 'selection',
      selectionTimer: null,
      roundStartTime: Date.now(),
      matchStartedAt: Date.now(),
      winnerId: null,
      roundResults: [],
      playersReady: new Set(),
    };
    this.status = 'selecting';

    this.players.forEach((player) => {
      const wasHost = player.isHost;
      player.resetForNewGame();
      player.isHost = wasHost;
      player.wantsRematch = false;
    });

    this.stats.roundDurations = [];

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },
};
