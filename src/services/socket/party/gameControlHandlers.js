const config = require('../../../../config/config');

module.exports = {
  async handleUpdateSettings(socket, data) {
    const party = await this.partyService.getPartyBySocket(socket.id);
    if (!party) {
      throw new Error('Party not found');
    }

    const player = await this.partyService.getPlayerBySocket(socket.id);
    if (!player || !player.isHost) {
      throw new Error('Only host can update settings');
    }

    if (party.gameState.phase !== 'lobby') {
      throw new Error('Cannot update settings during active game');
    }

    const updatedSettings = party.updateSettings(data, player.id);
    await this.partyService.saveParty(party);

    this.io.to(party.code).emit('settings_updated', {
      settings: updatedSettings,
      updatedBy: player.name,
    });

    await this.emitPublicDirectoryUpdate();
    this.logger.info({ partyCode: party.code, playerName: player.name }, 'Settings updated');
  },

  async handleStartGame(socket) {
    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }
    const { party, player } = context;

    if (!player.isHost) {
      throw new Error('Only host can start the game');
    }

    if (party.players.size < 2) {
      throw new Error('Need 2 players to start');
    }

    party.startGame(player.id);
    party.startSelectionPhase();
    await this.partyService.saveParty(party);

    this.finishedPlayers.set(party.code, new Set());
    this.roundLocks.set(party.code, false);
    this.rematchVotes.delete(party.code);

    this.startSelectionTimer(party);

    this.io.to(party.code).emit('game_started', {
      party: party.getDetailedState(),
      selectionTimeLimit: config.SELECTION_TIME_LIMIT,
    });

    await this.emitPublicDirectoryUpdate();
    this.logger.info({ partyCode: party.code }, 'Game started');
  },

  async handleSettingsChangeRequest(socket) {
    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party) {
      throw new Error('Party not found');
    }
    const { party } = context;

    party.gameState.phase = 'lobby';
    party.status = 'waiting';

    party.players.forEach((player) => {
      player.resetForNewRound();
      player.wantsRematch = false;
    });
    await this.partyService.saveParty(party);

    this.finishedPlayers.delete(party.code);
    this.clearSelectionTimer(party.code);
    this.roundLocks.set(party.code, false);
    this.rematchVotes.delete(party.code);

    this.io.to(party.code).emit('settings_change_started', {
      party: party.getDetailedState(),
    });

    await this.emitPublicDirectoryUpdate();
  },

  async handlePlayerTyping(socket, data) {
    const party = await this.partyService.getPartyBySocket(socket.id);
    if (!party) {
      return;
    }

    const player = await this.partyService.getPlayerBySocket(socket.id);
    if (!player) {
      return;
    }

    socket.to(party.code).emit('player_typing', {
      playerId: player.id,
      playerName: player.name,
      isTyping: data.isTyping,
    });
  },

  async handleHeartbeat(socket, data = {}) {
    // Silent rate-limit: max one heartbeat ack per 3 seconds per socket.
    // We still respond but skip the expensive DB activity update when flooded.
    const heartbeatKey = `${socket.id}_heartbeat`;
    const now = Date.now();
    const lastHeartbeat = this.rateLimits.get(heartbeatKey);
    const HEARTBEAT_MIN_INTERVAL = 3000;
    const tooFrequent = lastHeartbeat && now - lastHeartbeat < HEARTBEAT_MIN_INTERVAL;

    this.rateLimits.set(heartbeatKey, now);

    const clientTimestamp = Number(data?.timestamp);
    const clientPerfNow = Number(data?.clientPerfNow);
    socket.emit('heartbeat_ack', {
      timestamp: Date.now(),
      clientTimestamp: Number.isFinite(clientTimestamp) ? clientTimestamp : null,
      clientPerfNow: Number.isFinite(clientPerfNow) ? clientPerfNow : null,
    });

    if (tooFrequent) {
      return;
    }

    Promise.resolve()
      .then(() => this.partyService.getPartyContextBySocket(socket.id))
      .then(async (context) => {
        if (context?.player && context?.party) {
          context.player.updateActivity();
          context.party.updateActivity();
          await this.partyService.saveParty(context.party);
        }
      })
      .catch((error) => {
        this.logger.debug(
          { socketId: socket.id, error: error.message },
          'Heartbeat activity update skipped'
        );
      });
  },
};
