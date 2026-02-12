const config = require('../../../config/config');
const { validatePartyCode, validatePlayerName } = require('./validators');
const { clearPartyMappings } = require('./storeOps');
const { formatPartyDetails, formatStats, formatSystemHealth } = require('./reporting');

module.exports = {
  async cleanupInactiveParties() {
    let cleanedCount = 0;
    const allParties = await this.store.getAllParties();

    for (const party of allParties) {
      if (party.isInactive() || party.isEmpty()) {
        await clearPartyMappings(this.store, party);
        await this.store.deleteParty(party.code);
        cleanedCount++;
      }
    }

    return cleanedCount;
  },

  async getActiveParties() {
    const parties = await this.store.getAllParties();
    return parties.filter((party) => !party.isEmpty());
  },

  async getStats() {
    const activeParties = await this.getActiveParties();
    const activePlayers = activeParties.reduce((total, party) => total + party.players.size, 0);
    return formatStats(this.stats, activeParties, activePlayers);
  },

  async getActivePartiesCount() {
    const parties = await this.getActiveParties();
    return parties.length;
  },

  async getActivePlayersCount() {
    const parties = await this.getActiveParties();
    return parties.reduce((total, party) => total + party.players.size, 0);
  },

  getTotalPartiesCreated() {
    return this.stats.totalPartiesCreated;
  },

  getTotalPlayersCount() {
    return this.stats.totalPlayersJoined;
  },

  getGamesCompletedCount() {
    return this.stats.gamesCompleted;
  },

  recordGameCompletion() {
    this.stats.gamesCompleted++;
  },

  validatePartyCode(code) {
    return validatePartyCode(code, config.PARTY_CODE_LENGTH);
  },

  validatePlayerName(name) {
    return validatePlayerName(name);
  },

  async getPartyDetails(partyCode) {
    const party = await this.getParty(partyCode);
    if (!party) {
      return null;
    }

    return formatPartyDetails(party);
  },

  async broadcastToParty(partyCode, event, data, io) {
    const party = await this.getParty(partyCode);
    if (!party) {
      return false;
    }

    party.players.forEach((player) => {
      if (player.isConnected) {
        io.to(player.socketId).emit(event, data);
      }
    });

    return true;
  },

  async sendToPlayer(playerId, event, data, io) {
    const partyCode = await this.store.getPartyCodeForPlayer(playerId);
    if (!partyCode) {
      return false;
    }

    const party = await this.getParty(partyCode);
    if (!party) {
      return false;
    }

    const player = party.getPlayer(playerId);
    if (!player || !player.isConnected) {
      return false;
    }

    io.to(player.socketId).emit(event, data);
    return true;
  },

  async getAllParties() {
    const parties = await this.store.getAllParties();
    return parties.map((party) => ({
      code: party.code,
      ...party.getPublicInfo(),
    }));
  },

  async emergencyCleanup() {
    return { partiesRemoved: 0, playersRemoved: 0 };
  },

  async getSystemHealth() {
    const activeParties = await this.getActiveParties();
    const memoryUsage = process.memoryUsage();
    const totalParties = await this.store.getPartyCount();
    const activePlayers = await this.getActivePlayersCount();

    return formatSystemHealth({
      totalParties,
      activeParties,
      activePlayers,
      stats: this.stats,
      memoryUsage,
    });
  },
};
