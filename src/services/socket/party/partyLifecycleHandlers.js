module.exports = {
  async handleCreateParty(socket, data) {
    const { playerName, guestToken, guestSessionSecret } = data;

    const nameValidation = this.partyService.validatePlayerName(playerName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    if (await this.partyService.isSocketInParty(socket.id)) {
      await this.handleLeaveParty(socket, true);
    }

    const profile = this.profileService
      ? await this.profileService.resolveGuestProfile(
          nameValidation.name,
          guestToken,
          guestSessionSecret
        )
      : null;
    const party = await this.partyService.createParty(
      socket.id,
      nameValidation.name,
      profile ? profile.id : null
    );
    const hostPlayer = party.getPlayer(party.hostId);
    const reconnectSecret = hostPlayer.issueReconnectSecret();
    await this.partyService.saveParty(party);

    socket.join(party.code);

    this.logger.info(
      {
        socketId: socket.id,
        partyCode: party.code,
        playerName: nameValidation.name,
        profileId: profile ? profile.id : null,
      },
      'Party created'
    );

    socket.emit('party_created', {
      party: party.getPublicInfo(),
      player: hostPlayer.getPrivateInfo(),
      profile,
      reconnectSecret,
    });

    await this.emitPublicDirectoryUpdate();
  },

  async handleJoinParty(socket, data) {
    const { partyCode, playerName, guestToken, guestSessionSecret } = data;

    const codeValidation = this.partyService.validatePartyCode(partyCode);
    if (!codeValidation.valid) {
      throw new Error(codeValidation.error);
    }

    const nameValidation = this.partyService.validatePlayerName(playerName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    if (await this.partyService.isSocketInParty(socket.id)) {
      await this.handleLeaveParty(socket, true);
    }

    const profile = this.profileService
      ? await this.profileService.resolveGuestProfile(
          nameValidation.name,
          guestToken,
          guestSessionSecret
        )
      : null;
    const result = await this.partyService.joinParty(
      partyCode.toUpperCase(),
      socket.id,
      nameValidation.name,
      profile ? profile.id : null
    );
    const reconnectSecret = result.player.issueReconnectSecret();
    await this.partyService.saveParty(result.party);

    socket.join(result.party.code);

    this.logger.info(
      {
        socketId: socket.id,
        partyCode: result.party.code,
        playerName: nameValidation.name,
      },
      'Player joined party'
    );

    socket.to(result.party.code).emit('player_joined', {
      party: result.party.getPublicInfo(),
      newPlayer: result.player.getPublicInfo(),
    });

    socket.emit('party_joined', {
      party: result.party.getPublicInfo(),
      player: result.player.getPrivateInfo(),
      profile,
      reconnectSecret,
    });

    await this.emitPublicDirectoryUpdate();
  },

  async handleJoinPublicParty(socket, data) {
    const { partyCode, playerName, guestToken, guestSessionSecret } = data;

    const codeValidation = this.partyService.validatePartyCode(partyCode);
    if (!codeValidation.valid) {
      throw new Error(codeValidation.error);
    }

    const nameValidation = this.partyService.validatePlayerName(playerName);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    if (await this.partyService.isSocketInParty(socket.id)) {
      await this.handleLeaveParty(socket, true);
    }

    const profile = this.profileService
      ? await this.profileService.resolveGuestProfile(
          nameValidation.name,
          guestToken,
          guestSessionSecret
        )
      : null;
    const result = await this.partyService.joinPublicParty(
      partyCode.toUpperCase(),
      socket.id,
      nameValidation.name,
      profile ? profile.id : null
    );
    const reconnectSecret = result.player.issueReconnectSecret();
    await this.partyService.saveParty(result.party);

    socket.join(result.party.code);

    this.logger.info(
      {
        socketId: socket.id,
        partyCode: result.party.code,
        playerName: nameValidation.name,
      },
      'Player joined public party'
    );

    socket.to(result.party.code).emit('player_joined', {
      party: result.party.getPublicInfo(),
      newPlayer: result.player.getPublicInfo(),
    });

    socket.emit('party_joined', {
      party: result.party.getPublicInfo(),
      player: result.player.getPrivateInfo(),
      profile,
      reconnectSecret,
    });

    await this.emitPublicDirectoryUpdate();
  },

  async handleSetPartyVisibility(socket, data = {}) {
    const visibility =
      typeof data.visibility === 'string' ? data.visibility.trim().toLowerCase() : '';
    const party = await this.partyService.updatePartyVisibility(socket.id, visibility);

    this.io.to(party.code).emit('party_visibility_updated', {
      party: party.getPublicInfo(),
      visibility: party.visibility,
    });

    await this.emitPublicDirectoryUpdate();
  },

  async handleLeaveParty(socket, silent = false) {
    const result = await this.partyService.leaveParty(socket.id);
    if (!result) {
      return;
    }

    const { party, player, partyCode, wasHost } = result;
    socket.leave(partyCode);

    if (this.finishedPlayers.has(partyCode)) {
      this.finishedPlayers.get(partyCode).delete(player.id);
      if (this.finishedPlayers.get(partyCode).size === 0) {
        this.finishedPlayers.delete(partyCode);
      }
    }

    const rematchVotes = this.rematchVotes.get(partyCode);
    if (rematchVotes) {
      rematchVotes.delete(player.id);
      if (rematchVotes.size === 0) {
        this.rematchVotes.delete(partyCode);
      } else {
        this.rematchVotes.set(partyCode, rematchVotes);
      }
    }

    this.logger.info(
      { socketId: socket.id, playerName: player.name, partyCode },
      'Player left party'
    );

    if (wasHost || player.isHost) {
      this.io.to(partyCode).emit('party_closed_host_left', {
        hostName: player.name,
        message: `Party closed - ${player.name} (host) left`,
      });

      this.clearSelectionTimer(partyCode);
      this.roundLocks.delete(partyCode);
      this.rematchVotes.delete(partyCode);
    } else if (!party.isEmpty() && party.gameState.phase === 'playing') {
      const remainingPlayer = Array.from(party.players.values())[0];

      this.io.to(partyCode).emit('game_ended_by_leave', {
        winner: remainingPlayer.getPublicInfo(),
        leftPlayer: player.getPublicInfo(),
        message: `${player.name} left. ${remainingPlayer.name} wins!`,
      });

      party.gameState.phase = 'results';
      await this.partyService.saveParty(party);
    } else if (!party.isEmpty()) {
      socket.to(partyCode).emit('player_left', {
        party: party.getPublicInfo(),
        leftPlayer: player.getPublicInfo(),
      });
    }

    if (!silent) {
      socket.emit('party_left', { partyCode });
    }

    if (party.isEmpty()) {
      this.clearSelectionTimer(partyCode);
      this.finishedPlayers.delete(partyCode);
      this.roundLocks.delete(partyCode);
      this.rematchVotes.delete(partyCode);
    }

    await this.emitPublicDirectoryUpdate();
  },
};
