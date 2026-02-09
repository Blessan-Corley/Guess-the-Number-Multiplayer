const config = require('../../../config/config');

module.exports = {
  addPlayer(player) {
    if (this.players.size >= config.MAX_PLAYERS_PER_PARTY) {
      throw new Error('Party is full');
    }

    if (this.players.has(player.id)) {
      throw new Error('Player already in party');
    }

    this.players.set(player.id, player);
    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return false;
    }

    this.players.delete(playerId);
    this.gameState.playersReady.delete(playerId);

    if (playerId === this.hostId) {
      this.status = 'closed';
      this.gameState.phase = 'finished';
      this._incrementStateVersion();
      return 'HOST_LEFT';
    }

    this.updateActivity();
    this._incrementStateVersion();
    return true;
  },

  getPlayer(playerId) {
    return this.players.get(playerId);
  },

  getPlayerBySocketId(socketId) {
    return Array.from(this.players.values()).find((player) => player.socketId === socketId);
  },

  getHost() {
    return this.players.get(this.hostId);
  },

  isFull() {
    return this.players.size >= config.MAX_PLAYERS_PER_PARTY;
  },

  isEmpty() {
    return this.players.size === 0;
  },

  allPlayersReady() {
    if (this.players.size < 2) {
      return false;
    }
    return Array.from(this.players.values()).every((player) => player.isReady);
  },

  updateActivity() {
    this.lastActivity = Date.now();
  },

  isInactive(timeoutMs = config.INACTIVITY_TIMEOUT) {
    return Date.now() - this.lastActivity > timeoutMs;
  },
};
