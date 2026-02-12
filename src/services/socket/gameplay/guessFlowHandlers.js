module.exports = {
  async handleMakeGuess(socket, data) {
    const { guess } = data;

    const context = await this.partyService.getPartyContextBySocket(socket.id);
    if (!context?.party || !context?.player) {
      throw new Error('Party not found');
    }

    const { party, player } = context;

    if (party.gameState.phase !== 'playing') {
      throw new Error('Game not in playing phase');
    }

    const finishedSet = this.finishedPlayers.get(party.code) || new Set();
    if (finishedSet.has(player.id)) {
      throw new Error('You already found the number! Wait for opponent.');
    }

    const opponent = Array.from(party.players.values()).find(
      (partyPlayer) => partyPlayer.id !== player.id
    );
    if (!opponent) {
      throw new Error('Opponent not found');
    }

    const guessResult = party.makeGuess(player.id, guess);
    this.partyService.saveParty(party).catch((error) => {
      this.logger.error(
        { partyCode: party.code, error: error.message },
        'Failed to persist guess state'
      );
    });

    const feedback = this.gameService.generateFeedback(
      guess,
      opponent.secretNumber,
      party.gameSettings.rangeStart,
      party.gameSettings.rangeEnd
    );

    socket.emit('guess_result', {
      guess,
      attempts: player.attempts,
      feedback,
      isCorrect: guessResult.isCorrect,
    });

    this.io.to(opponent.socketId).emit('opponent_guessed', {
      opponentName: player.name,
      attempts: player.attempts,
      isCorrect: guessResult.isCorrect,
    });

    if (guessResult.isCorrect) {
      await this.handlePlayerFinished(party, player, opponent, finishedSet);
    } else if (finishedSet.has(opponent.id) && player.attempts >= opponent.attempts) {
      await this.endRoundEarly(party, opponent.id, 'exceeded_attempts');
    }
  },

  async handlePlayerFinished(party, player, opponent, finishedSet) {
    finishedSet.add(player.id);
    this.finishedPlayers.set(party.code, finishedSet);

    player.hasFinished = true;
    player.finishedAt = Date.now();
    await this.partyService.saveParty(party);

    this.io.to(party.code).emit('player_finished', {
      playerId: player.id,
      playerName: player.name,
      attempts: player.attempts,
      isFirstToFinish: finishedSet.size === 1,
      targetNumber: opponent.secretNumber,
    });

    if (finishedSet.size >= 2) {
      await this.determineWinnerAndEndRound(party, finishedSet);
      return;
    }

    const canOpponentWin = opponent.attempts < player.attempts;
    if (canOpponentWin) {
      this.io.to(opponent.socketId).emit('opponent_finished_first', {
        opponentName: player.name,
        opponentAttempts: player.attempts,
        yourAttempts: opponent.attempts,
        attemptsToWin: player.attempts - 1,
        attemptsToTie: player.attempts,
      });

      this.io.to(player.socketId).emit('waiting_for_opponent', {
        message: `You found it in ${player.attempts} attempts! Waiting for opponent to finish...`,
        opponentAttempts: opponent.attempts,
      });
      return;
    }

    await this.endRoundEarly(party, player.id, 'exceeded_attempts');
  },

  async determineWinnerAndEndRound(party, finishedSet) {
    if (this.roundLocks.get(party.code)) {
      return;
    }
    // Secondary guard: phase may have already advanced (e.g. two concurrent calls)
    if (party.gameState.phase !== 'playing') {
      return;
    }
    this.roundLocks.set(party.code, true);
    try {
      const players = Array.from(party.players.values());
      const finishedPlayers = players.filter((player) => finishedSet.has(player.id));

      finishedPlayers.sort((left, right) => {
        if (left.attempts !== right.attempts) {
          return left.attempts - right.attempts;
        }
        return left.finishedAt - right.finishedAt;
      });

      const winner = finishedPlayers[0];
      const loser = finishedPlayers[1];

      let winReason = 'fewer_attempts';
      if (winner.attempts === loser.attempts) {
        winReason = 'same_attempts_faster';
      }

      await this.endRound(party, winner.id, {
        winReason,
        winnerAttempts: winner.attempts,
        loserAttempts: loser.attempts,
        bothFinished: true,
      });
      // Lock intentionally stays true until handleNextRound / handleRematch resets it,
      // preventing a second concurrent call from re-entering after endRound completes.
    } catch (error) {
      // Release lock on failure so the game isn't permanently stuck.
      this.roundLocks.set(party.code, false);
      throw error;
    }
  },

  async endRoundEarly(party, winnerId, reason) {
    if (this.roundLocks.get(party.code)) {
      return;
    }
    // Secondary guard: phase may have already advanced
    if (party.gameState.phase !== 'playing') {
      return;
    }
    this.roundLocks.set(party.code, true);
    try {
      const winner = party.getPlayer(winnerId);
      const players = Array.from(party.players.values());
      const loser = players.find((player) => player.id !== winnerId);

      await this.endRound(party, winnerId, {
        winReason: reason,
        winnerAttempts: winner.attempts,
        loserAttempts: loser ? loser.attempts : 0,
        bothFinished: false,
        earlyEnd: true,
      });
      // Lock intentionally stays true until next round / rematch resets it.
    } catch (error) {
      this.roundLocks.set(party.code, false);
      throw error;
    }
  },

  async endRound(party, winnerId, additionalData = {}) {
    const result = party.endRound(winnerId);
    await this.partyService.saveParty(party);

    const { roundResult, isGameComplete, gameWinner } = result;
    this.finishedPlayers.delete(party.code);

    const roundSummary = this.gameService.generateRoundSummary(roundResult, party.gameSettings);

    this.io.to(party.code).emit('round_ended', {
      roundResult: roundSummary,
      isGameComplete,
      gameWinner: gameWinner ? gameWinner.getPublicInfo() : null,
      party: party.getDetailedState(),
      additionalData,
    });

    if (isGameComplete) {
      this.partyService.recordGameCompletion();

      (async () => {
        try {
          if (this.persistenceService) {
            await this.persistenceService.recordCompletedParty(party);
          }
          await this.broadcastProgressUpdates(party);
        } catch (error) {
          this.logger.error(
            { partyCode: party.code, error: error.message },
            'Failed to broadcast post-match progress updates'
          );
        }
      })();
    }

    this.logger.info({ partyCode: party.code, winnerId }, 'Round ended');
  },
};
