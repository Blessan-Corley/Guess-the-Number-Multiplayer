module.exports = {
  async getPartyContextBySocket(socketId) {
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

    return {
      party,
      player,
      playerId,
      partyCode,
    };
  },

  async getParty(partyCode) {
    if (!partyCode) {
      return null;
    }
    return this.store.getParty(partyCode.toUpperCase());
  },

  async getPartyBySocket(socketId) {
    const playerId = await this.store.getPlayerIdForSocket(socketId);
    if (!playerId) {
      return null;
    }

    const partyCode = await this.store.getPartyCodeForPlayer(playerId);
    if (!partyCode) {
      return null;
    }

    return this.store.getParty(partyCode);
  },

  async getPlayerBySocket(socketId) {
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

    return party.getPlayer(playerId);
  },

  async isSocketInParty(socketId) {
    const playerId = await this.store.getPlayerIdForSocket(socketId);
    return !!playerId;
  },

  async reconnectPlayer(socketId, partyCode, playerId, reconnectSecret) {
    const party = await this.store.getParty(partyCode);
    if (!party) {
      return { success: false, error: 'Party not found' };
    }

    const player = party.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in party' };
    }

    if (!player.verifyReconnectSecret(reconnectSecret)) {
      return { success: false, error: 'Invalid reconnect credentials' };
    }

    const oldSocketId = player.socketId;
    await this.store.removeSocketMapping(oldSocketId);
    await this.store.mapSocketToPlayer(socketId, playerId);

    player.updateSocketId(socketId);
    player.setConnected(true);
    const rotatedReconnectSecret = player.issueReconnectSecret();
    party.updateActivity();
    await this.store.saveParty(party);

    return { success: true, party, player, reconnectSecret: rotatedReconnectSecret };
  },

  async cleanupDisconnectedPlayer(socketId) {
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
    if (player) {
      player.setConnected(false);
      await this.store.saveParty(party);
    }

    return { party, player, partyCode };
  },
};
