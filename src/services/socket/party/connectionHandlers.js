const config = require('../../../../config/config');

module.exports = {
  async handleReconnectAttempt(socket, data) {
    const { partyCode, playerId, reconnectSecret } = data;

    const timeoutKey = `${partyCode}_${playerId}`;
    if (this.reconnectTimeouts.has(timeoutKey)) {
      clearTimeout(this.reconnectTimeouts.get(timeoutKey));
      this.reconnectTimeouts.delete(timeoutKey);
    }

    const result = await this.partyService.reconnectPlayer(
      socket.id,
      partyCode,
      playerId,
      reconnectSecret
    );

    if (result.success) {
      socket.join(partyCode);

      socket.emit('reconnected', {
        party: result.party.getDetailedState(),
        player: result.player.getPrivateInfo(),
        reconnectSecret: result.reconnectSecret,
      });

      socket.to(partyCode).emit('player_reconnected', {
        playerId,
        playerName: result.player.name,
      });

      await this.emitPublicDirectoryUpdate();
      this.logger.info({ partyCode, playerName: result.player.name }, 'Player reconnected');
    } else {
      socket.emit('reconnect_failed', { error: result.error });
    }
  },

  async handleDisconnection(socket, reason) {
    this.logger.info({ socketId: socket.id, reason }, 'Socket disconnected');

    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      return;
    }
    const { party, player } = context;

    const timeoutKey = `${party.code}_${player.id}`;
    const reconnectTimeout = setTimeout(() => {
      this.handleLeaveParty(socket, true);
    }, config.RECONNECT_GRACE_PERIOD_MS);
    if (typeof reconnectTimeout.unref === 'function') {
      reconnectTimeout.unref();
    }

    this.reconnectTimeouts.set(timeoutKey, reconnectTimeout);

    const rematchVotes = this.rematchVotes.get(party.code);
    if (rematchVotes) {
      rematchVotes.delete(player.id);
      if (rematchVotes.size === 0) {
        this.rematchVotes.delete(party.code);
      } else {
        this.rematchVotes.set(party.code, rematchVotes);
      }
    }

    player.setConnected(false);
    await this.partyService.saveParty(party);

    socket.to(party.code).emit('player_disconnected', {
      playerId: player.id,
      playerName: player.name,
      gracePeriod: config.RECONNECT_GRACE_PERIOD_MS,
    });

    await this.emitPublicDirectoryUpdate();
  },
};
