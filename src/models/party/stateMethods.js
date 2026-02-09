const config = require('../../../config/config');

module.exports = {
  _incrementStateVersion() {
    this._stateVersion++;
    this._lastStateChange = Date.now();
  },

  canChangeVisibility() {
    return this.gameState.phase === 'lobby' && this.status === 'waiting';
  },

  setVisibility(visibility) {
    if (!['private', 'public'].includes(visibility)) {
      throw new Error('Invalid room visibility');
    }

    if (!this.canChangeVisibility()) {
      throw new Error('Room visibility can only be changed in the lobby');
    }

    this.visibility = visibility;
    this.updateActivity();
    this._incrementStateVersion();
    return this.visibility;
  },

  isPublicLobbyVisible() {
    return this.visibility === 'public' && this.canChangeVisibility() && !this.isEmpty();
  },

  getJoinStatus() {
    if (this.gameState.phase !== 'lobby' || this.status !== 'waiting') {
      return 'closed';
    }

    return this.isFull() ? 'filled' : 'open';
  },

  getDirectoryInfo() {
    const host = this.getHost();

    return {
      code: this.code,
      hostName: host ? host.name : 'Host',
      playerCount: this.players.size,
      maxPlayers: config.MAX_PLAYERS_PER_PARTY,
      visibility: this.visibility,
      joinStatus: this.getJoinStatus(),
      createdAt: this.createdAt,
      gameSettings: { ...this.gameSettings },
    };
  },

  getStateVersion() {
    return this._stateVersion;
  },

  validateState() {
    const errors = [];

    if (this.players.size === 0) {
      errors.push('Party has no players');
    }

    if (this.players.size > config.MAX_PLAYERS_PER_PARTY) {
      errors.push('Party exceeds maximum players');
    }

    if (this.hostId && !this.players.has(this.hostId)) {
      errors.push('Host player not found in party');
    }

    if (this.gameSettings.rangeStart >= this.gameSettings.rangeEnd) {
      errors.push('Invalid game range');
    }

    const rangeSize = this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1;
    if (rangeSize < config.MIN_RANGE_SIZE || rangeSize > config.MAX_RANGE_SIZE) {
      errors.push('Game range size out of bounds');
    }

    const connectedPlayers = Array.from(this.players.values()).filter(
      (player) => player.isConnected
    );

    if (connectedPlayers.length === 0) {
      errors.push('No connected players');
    }

    if (this.gameState.phase === 'playing') {
      const allHaveSecretNumbers = Array.from(this.players.values()).every(
        (player) => player.secretNumber !== null
      );

      if (!allHaveSecretNumbers) {
        errors.push('Not all players have secret numbers in playing phase');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      stateVersion: this._stateVersion,
    };
  },

  reconnectPlayer(playerId, newSocketId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return false;
    }

    player.updateSocketId(newSocketId);
    player.setConnected(true);

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  getStats() {
    const playerStats = Array.from(this.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      performance: player.getSessionPerformance(),
    }));

    return {
      partyId: this.id,
      code: this.code,
      createdAt: this.createdAt,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      totalRounds: this.stats.totalRounds,
      gamesCompleted: this.stats.gamesCompleted,
      totalGuesses: this.stats.totalGuesses,
      averageRoundDuration: this.stats.averageRoundDuration,
      players: playerStats,
      roundResults: this.gameState.roundResults,
      stateVersion: this._stateVersion,
    };
  },

  getPublicInfo() {
    return {
      id: this.id,
      code: this.code,
      createdAt: this.createdAt,
      status: this.status,
      visibility: this.visibility,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      phase: this.gameState.phase,
      playerCount: this.players.size,
      isFull: this.isFull(),
      gameSettings: { ...this.gameSettings },
      players: Array.from(this.players.values()).map((player) => player.getPublicInfo()),
      stateVersion: this._stateVersion,
    };
  },

  getDetailedState() {
    return {
      ...this.getPublicInfo(),
      gameState: {
        phase: this.gameState.phase,
        currentRound: this.currentRound,
        maxRounds: this.maxRounds,
        roundResults: this.gameState.roundResults,
        winnerId: this.gameState.winnerId,
        playersReady: Array.from(this.gameState.playersReady),
        roundStartTime: this.gameState.roundStartTime,
        matchStartedAt: this.gameState.matchStartedAt,
      },
      stats: { ...this.stats },
      lastActivity: this.lastActivity,
    };
  },

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      createdAt: this.createdAt,
      lastActivity: this.lastActivity,
      status: this.status,
      visibility: this.visibility,
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      gameSettings: this.gameSettings,
      gameState: {
        ...this.gameState,
        playersReady: Array.from(this.gameState.playersReady),
      },
      stats: this.stats,
      players: Array.from(this.players.values()).map((player) => player.toJSON()),
      _stateVersion: this._stateVersion,
      _lastStateChange: this._lastStateChange,
    };
  },
};
