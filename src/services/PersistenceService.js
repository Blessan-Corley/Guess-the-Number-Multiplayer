const { v4: uuidv4 } = require('uuid');

class PersistenceService {
  constructor(database, logger) {
    this.database = database;
    this.logger = logger;
  }

  async recordCompletedParty(party) {
    if (!this.database || !this.database.enabled) {
      return null;
    }

    const players = Array.from(party.players.values());
    const winner = party.getGameWinner() || players.find((player) => player.wins > 0) || null;
    const matchStartedAt = party.gameState.matchStartedAt || party.createdAt;
    const startedAt = new Date(matchStartedAt).toISOString();
    const completedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.now() - matchStartedAt);

    const payload = {
      id: uuidv4(),
      partyCode: party.code,
      gameMode: 'multiplayer',
      status: 'completed',
      rangeStart: party.gameSettings.rangeStart,
      rangeEnd: party.gameSettings.rangeEnd,
      winnerProfileId: winner ? winner.profileId : null,
      winnerName: winner ? winner.name : null,
      startedAt,
      completedAt,
      durationMs,
      roundCount: party.currentRound,
      metadata: {
        maxRounds: party.maxRounds,
        stateVersion: party.getStateVersion(),
      },
      participants: players.map((player) => ({
        id: uuidv4(),
        profileId: player.profileId || null,
        playerName: player.name,
        attempts: player.gameAttempts,
        wins: player.wins,
        isWinner: Boolean(winner && winner.id === player.id),
      })),
    };

    try {
      return await this.database.recordCompletedMatch(payload);
    } catch (error) {
      this.logger.error(
        {
          operation: 'recordCompletedParty',
          error: error.message,
          partyCode: party.code,
          gameMode: payload.gameMode,
          winnerProfileId: payload.winnerProfileId,
          participantProfileIds: payload.participants
            .map((participant) => participant.profileId)
            .filter(Boolean),
        },
        'Failed to record completed party'
      );
      return null;
    }
  }
}

module.exports = PersistenceService;
