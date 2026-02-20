const PersistenceService = require('../../src/services/PersistenceService');

describe('PersistenceService', () => {
  test('logs structured context when completed match persistence fails', async () => {
    const logger = {
      error: jest.fn(),
    };
    const service = new PersistenceService(
      {
        enabled: true,
        recordCompletedMatch: jest.fn().mockRejectedValue(new Error('db write failed')),
      },
      logger
    );

    const party = {
      code: 'ROOM42',
      createdAt: Date.now() - 3000,
      currentRound: 2,
      maxRounds: 3,
      gameSettings: {
        rangeStart: 1,
        rangeEnd: 100,
      },
      gameState: {
        matchStartedAt: Date.now() - 2000,
      },
      players: new Map([
        [
          'host',
          {
            id: 'host-player',
            profileId: 'profile-host',
            name: 'Host',
            gameAttempts: 5,
            wins: 1,
          },
        ],
        [
          'guest',
          {
            id: 'guest-player',
            profileId: 'profile-guest',
            name: 'Guest',
            gameAttempts: 6,
            wins: 0,
          },
        ],
      ]),
      getGameWinner() {
        return {
          id: 'host-player',
          profileId: 'profile-host',
          name: 'Host',
        };
      },
      getStateVersion() {
        return 7;
      },
    };

    const result = await service.recordCompletedParty(party);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'recordCompletedParty',
        partyCode: 'ROOM42',
        winnerProfileId: 'profile-host',
        participantProfileIds: ['profile-host', 'profile-guest'],
        error: 'db write failed',
      }),
      'Failed to record completed party'
    );
  });
});
