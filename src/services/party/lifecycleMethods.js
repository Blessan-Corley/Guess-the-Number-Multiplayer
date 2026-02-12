const crypto = require('crypto');
const Party = require('../../models/Party');
const Player = require('../../models/Player');
const config = require('../../../config/config');
const { removePlayerFromParty, detachExistingSession } = require('./storeOps');

module.exports = {
  async withPartyLock(partyCode, operation) {
    const normalizedCode = partyCode.toUpperCase();
    const previous = this.partyLocks.get(normalizedCode) || Promise.resolve();
    let releaseLock;
    const current = new Promise((resolve) => {
      releaseLock = resolve;
    });

    this.partyLocks.set(normalizedCode, current);
    await previous;

    try {
      return await operation();
    } finally {
      releaseLock();
      if (this.partyLocks.get(normalizedCode) === current) {
        this.partyLocks.delete(normalizedCode);
      }
    }
  },

  async generatePartyCode() {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const CODE_LENGTH = config.PARTY_CODE_LENGTH;
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const bytes = crypto.randomBytes(CODE_LENGTH);
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARS[bytes[i] % CHARS.length];
      }
      const exists = await this.store.hasParty(code);
      if (!exists) {
        return code;
      }
    }

    throw new Error('Unable to generate unique party code after maximum attempts');
  },

  async createParty(hostSocketId, hostName, profileId = null) {
    if (!hostName || typeof hostName !== 'string') {
      throw new Error('Invalid host name');
    }

    await detachExistingSession(this.store, hostSocketId);

    const partyCode = await this.generatePartyCode();
    const hostPlayer = new Player(hostSocketId, hostName, profileId);
    const party = new Party(partyCode, hostPlayer);

    await this.store.saveParty(party);
    await this.store.mapPlayerToParty(hostPlayer.id, partyCode);
    await this.store.mapSocketToPlayer(hostSocketId, hostPlayer.id);

    this.stats.totalPartiesCreated++;
    this.stats.totalPlayersJoined++;

    return party;
  },

  async joinParty(partyCode, playerSocketId, playerName, profileId = null, options = {}) {
    if (!partyCode || !playerName) {
      throw new Error('Party code and player name are required');
    }

    const normalizedCode = partyCode.toUpperCase();
    return this.withPartyLock(normalizedCode, async () => {
      const party = await this.store.getParty(normalizedCode);
      if (!party) {
        throw new Error('Party not found');
      }

      if (options.requirePublicLobby && !party.isPublicLobbyVisible()) {
        throw new Error('Party not found');
      }

      if (party.isFull()) {
        throw new Error('Party is full');
      }

      await detachExistingSession(this.store, playerSocketId, normalizedCode);

      const player = new Player(playerSocketId, playerName, profileId);
      party.addPlayer(player);

      await this.store.saveParty(party);
      await this.store.mapPlayerToParty(player.id, normalizedCode);
      await this.store.mapSocketToPlayer(playerSocketId, player.id);

      this.stats.totalPlayersJoined++;

      return { party, player };
    });
  },

  async leaveParty(socketId) {
    const playerId = await this.store.getPlayerIdForSocket(socketId);
    if (!playerId) {
      return null;
    }

    const partyCode = await this.store.getPartyCodeForPlayer(playerId);
    if (!partyCode) {
      return null;
    }

    const party = await this.store.getParty(partyCode);
    if (!party) {
      return null;
    }

    const player = party.getPlayer(playerId);
    if (!player) {
      return null;
    }

    const wasHost = player.isHost;
    await removePlayerFromParty(this.store, partyCode, playerId);
    await this.store.removePlayerMapping(playerId);
    await this.store.removeSocketMapping(socketId);

    const updatedParty = await this.store.getParty(partyCode);
    return { party: updatedParty || party, player, partyCode, wasHost };
  },

  async saveParty(party) {
    await this.store.saveParty(party);
  },
};
