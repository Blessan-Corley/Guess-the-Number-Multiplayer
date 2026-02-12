module.exports = {
  async updatePartyVisibility(socketId, visibility) {
    const context = await this.getPartyContextBySocket(socketId);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }

    if (!context.player.isHost) {
      throw new Error('Only the host can change room visibility');
    }

    context.party.setVisibility(visibility);
    await this.store.saveParty(context.party);
    return context.party;
  },

  async listPublicParties() {
    const parties = await this.store.getAllParties();
    return parties
      .filter((party) => party.isPublicLobbyVisible())
      .sort((left, right) => left.createdAt - right.createdAt)
      .map((party) => party.getDirectoryInfo());
  },

  async getPublicLobbyStats() {
    const parties = await this.store.getAllParties();
    const activeParties = parties.filter((party) => !party.isEmpty());

    return {
      onlinePlayers: activeParties.reduce(
        (total, party) =>
          total + Array.from(party.players.values()).filter((player) => player.isConnected).length,
        0
      ),
      activeMatches: activeParties.filter((party) => party.gameState.phase === 'playing').length,
      publicRooms: activeParties.filter((party) => party.isPublicLobbyVisible()).length,
    };
  },

  async joinPublicParty(partyCode, socketId, playerName, profileId = null) {
    return this.joinParty(partyCode, socketId, playerName, profileId, { requirePublicLobby: true });
  },
};
