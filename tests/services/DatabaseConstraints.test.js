const { newDb } = require('pg-mem');
const Database = require('../../src/lib/database');

describe('Database constraints', () => {
  function createDatabase() {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();

    return new Database({
      connectionString: 'postgres://test',
      poolFactory: (poolConfig) => new pgAdapter.Pool(poolConfig),
      autoMigrate: true,
      failOnPendingMigrations: false,
    });
  }

  function createCompletedMatch(overrides = {}) {
    return {
      id: '7e7b4f26-d237-4a7d-b99f-7a68bf30e001',
      partyCode: 'ROOM99',
      gameMode: 'multiplayer',
      status: 'completed',
      rangeStart: 1,
      rangeEnd: 100,
      winnerProfileId: null,
      winnerName: 'Winner',
      startedAt: new Date('2026-03-16T10:00:00.000Z').toISOString(),
      completedAt: new Date('2026-03-16T10:05:00.000Z').toISOString(),
      durationMs: 300000,
      roundCount: 1,
      metadata: {},
      participants: [
        {
          id: '0d871ef1-1f56-4abc-9d77-0ee81389d001',
          profileId: null,
          playerName: 'Player One',
          attempts: 7,
          wins: 1,
          isWinner: true,
        },
        {
          id: '0d871ef1-1f56-4abc-9d77-0ee81389d002',
          profileId: null,
          playerName: 'Player Two',
          attempts: 8,
          wins: 0,
          isWinner: false,
        },
      ],
      ...overrides,
    };
  }

  test('rejects completed matches with an invalid number range', async () => {
    const database = createDatabase();
    await database.connect();

    await expect(
      database.recordCompletedMatch(
        createCompletedMatch({
          rangeStart: 50,
          rangeEnd: 10,
        })
      )
    ).rejects.toThrow();

    await database.close();
  });

  test('rejects participant stats below zero', async () => {
    const database = createDatabase();
    await database.connect();

    await expect(
      database.recordCompletedMatch(
        createCompletedMatch({
          participants: [
            {
              id: '0d871ef1-1f56-4abc-9d77-0ee81389d003',
              profileId: null,
              playerName: 'Player One',
              attempts: -1,
              wins: 1,
              isWinner: true,
            },
          ],
        })
      )
    ).rejects.toThrow();

    await database.close();
  });
});
