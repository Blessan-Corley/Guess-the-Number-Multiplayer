const request = require('supertest');
const { newDb } = require('pg-mem');
const GameServer = require('../../server');
const Database = require('../../src/lib/database');

describe('Integration: transient database recovery', () => {
  let gameServer;

  beforeAll(async () => {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();
    let bootstrapAttempts = 0;

    const database = new Database({
      connectionString: 'postgres://test',
      poolFactory: (poolConfig) => {
        bootstrapAttempts += 1;

        if (bootstrapAttempts === 1) {
          return {
            query: jest.fn().mockRejectedValue(new Error('database temporarily unavailable')),
            end: jest.fn().mockResolvedValue(undefined),
          };
        }

        return new pgAdapter.Pool(poolConfig);
      },
    });

    gameServer = new GameServer({ database });
    await gameServer.ready;
  });

  afterAll(async () => {
    await gameServer.stop();
  });

  test('profile APIs recover after a transient database bootstrap failure', async () => {
    const guestToken = 'guest-token-transient-db';
    const guestSessionSecret = 'guest-session-transient-db';

    await request(gameServer.app)
      .post('/api/profiles/guest')
      .set('x-guest-session-secret', guestSessionSecret)
      .send({
        displayName: 'Recoverable Profile',
        guestToken,
      })
      .expect(200);

    const fetchResponse = await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-token', guestToken)
      .set('x-guest-session-secret', guestSessionSecret)
      .expect(200);

    expect(fetchResponse.body.profile).toMatchObject({
      displayName: 'Recoverable Profile',
      guestToken,
    });
    expect(fetchResponse.body.matches).toEqual([]);
  });
});
