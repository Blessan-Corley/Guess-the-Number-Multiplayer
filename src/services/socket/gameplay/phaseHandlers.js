module.exports = {
  async handleSetReady(socket, data) {
    const { secretNumber } = data;

    // Resolve identity outside the lock (read-only lookup, no mutation)
    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }
    const { partyCode, playerId } = context;

    // Hold the party lock for the entire read-mutate-save cycle so a
    // concurrent timer expiry cannot overwrite our save (or vice-versa).
    await this.partyService.withPartyLock(partyCode, async () => {
      const party = await this.partyService.getParty(partyCode);
      if (!party) throw new Error('Party not found');

      const player = party.getPlayer(playerId);
      if (!player) throw new Error('Player not found');

      if (party.gameState.phase === 'playing') {
        // A client can submit a late/retried ready action after the room has
        // already advanced. Treat that as a resync request instead of a fatal
        // mismatch so the player still lands in the active round.
        if (party.allPlayersReady()) {
          this.io.to(socket.id).emit('playing_started', {
            party: party.getDetailedState(),
          });
          return;
        }

        throw new Error('Selection already completed');
      }

      if (party.gameState.phase !== 'selection') {
        throw new Error('Not in selection phase');
      }

      party.setPlayerReady(player.id, secretNumber);
      await this.partyService.saveParty(party);

      this.io.to(party.code).emit('player_ready', {
        playerId: player.id,
        playerName: player.name,
        allReady: party.allPlayersReady(),
      });

      if (party.allPlayersReady()) {
        this.clearSelectionTimer(party.code);
        await this.startPlayingPhase(party);
      }
    });
  },

  async handleNextRound(socket) {
    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }
    const { party, player } = context;

    if (!player.isHost) {
      throw new Error('Only host can start next round');
    }

    party.nextRound();
    party.startSelectionPhase();
    await this.partyService.saveParty(party);

    this.finishedPlayers.set(party.code, new Set());
    this.roundLocks.set(party.code, false);
    this.rematchVotes.delete(party.code);

    this.startSelectionTimer(party);

    this.io.to(party.code).emit('next_round_started', {
      party: party.getDetailedState(),
      selectionTimeLimit: party.gameSettings.selectionTimeLimit,
    });
  },

  async handleRematch(socket) {
    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }
    const { party, player } = context;

    if (!['results', 'finished'].includes(party.gameState.phase)) {
      throw new Error('Rematch is only available after a round ends');
    }

    const votes = this.rematchVotes.get(party.code) || new Set();
    votes.add(player.id);
    this.rematchVotes.set(party.code, votes);

    party.players.forEach((partyPlayer) => {
      partyPlayer.wantsRematch = votes.has(partyPlayer.id);
    });
    await this.partyService.saveParty(party);

    const requiredVotes = party.players.size;
    if (votes.size >= requiredVotes) {
      party.rematch();
      await this.partyService.saveParty(party);

      this.finishedPlayers.delete(party.code);
      this.roundLocks.set(party.code, false);
      this.rematchVotes.delete(party.code);

      this.startSelectionTimer(party);

      this.io.to(party.code).emit('rematch_started', {
        party: party.getDetailedState(),
        selectionTimeLimit: party.gameSettings.selectionTimeLimit,
      });
      return;
    }

    this.io.to(party.code).emit('rematch_requested', {
      requestedBy: player.name,
      playerId: player.id,
      approvals: votes.size,
      required: requiredVotes,
    });
  },

  startSelectionTimer(party) {
    this.clearSelectionTimer(party.code);

    let timeLeft = party.gameSettings.selectionTimeLimit;
    party.gameState.roundStartTime = Date.now();

    const timer = setInterval(async () => {
      timeLeft--;

      this.io.to(party.code).emit('selection_timer', { timeLeft });

      if (timeLeft <= 0) {
        clearInterval(timer);
        this.selectionTimers.delete(party.code);

        // Hold the lock so a concurrent handleSetReady save cannot race us.
        await this.partyService.withPartyLock(party.code, async () => {
          const currentParty = await this.partyService.getParty(party.code);
          // If the party has already moved past selection (both players
          // submitted before the timer fired), skip auto-select entirely.
          if (!currentParty || currentParty.gameState.phase !== 'selection') return;

          currentParty.autoSelectNumbers();
          await this.partyService.saveParty(currentParty);
          await this.startPlayingPhase(currentParty);
        });
      }
    }, 1000);

    this.selectionTimers.set(party.code, timer);
  },

  clearSelectionTimer(partyCode) {
    const timer = this.selectionTimers.get(partyCode);
    if (timer) {
      clearInterval(timer);
      this.selectionTimers.delete(partyCode);
    }
  },

  async startPlayingPhase(party) {
    party.startPlayingPhase();
    party.gameState.roundStartTime = Date.now();
    await this.partyService.saveParty(party);

    this.io.to(party.code).emit('playing_started', {
      party: party.getDetailedState(),
    });

    this.logger.info({ partyCode: party.code }, 'Playing phase started');
  },
};
