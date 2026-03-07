const request = require('supertest');
const { newDb } = require('pg-mem');
const GameServer = require('../../server');
const Database = require('../../src/lib/database');

describe('Integration: Profile APIs', () => {
  let gameServer;

  beforeAll(async () => {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();
    const database = new Database({
      connectionString: 'postgres://test',
      poolFactory: (poolConfig) => new pgAdapter.Pool(poolConfig),
    });

    gameServer = new GameServer({ database });
    await gameServer.ready;
  });

  afterAll(async () => {
    await gameServer.stop();
  });

  test('Should create and return a guest profile', async () => {
    const guestToken = 'guest-token-profile-api';
    const guestSessionSecret = 'guest-session-profile-api';

    const createResponse = await request(gameServer.app)
      .post('/api/profiles/guest')
      .set('x-guest-session-secret', guestSessionSecret)
      .send({
        displayName: 'Profile API User',
        guestToken,
      })
      .expect(200);

    expect(createResponse.body.profile.displayName).toBe('Profile API User');
    expect(createResponse.body.profile.guestToken).toBe(guestToken);
    expect(createResponse.body.profile.guestSessionSecret).toBe(guestSessionSecret);
    expect(createResponse.body.credentials).toEqual({
      guestToken,
      guestSessionSecret,
    });

    const fetchResponse = await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-session-secret', guestSessionSecret)
      .set('x-guest-token', guestToken)
      .expect(200);

    expect(fetchResponse.body.profile.displayName).toBe('Profile API User');
    expect(fetchResponse.body.matches).toEqual([]);
  });

  test('Should exclude profiles without completed matches from leaderboard', async () => {
    await request(gameServer.app)
      .post('/api/profiles/guest')
      .set('x-guest-session-secret', 'guest-session-leaderboard')
      .send({
        displayName: 'Leaderboard User',
        guestToken: 'guest-token-leaderboard',
      })
      .expect(200);

    const response = await request(gameServer.app).get('/api/leaderboard').expect(200);

    expect(response.body.leaderboard).toEqual([]);
  });

  test('Should sanitize guest display names before storing', async () => {
    const guestToken = 'guest-token-sanitize-profile-api';

    const response = await request(gameServer.app)
      .post('/api/profiles/guest')
      .set('x-guest-session-secret', 'guest-session-sanitize-profile-api')
      .send({
        displayName: '<script>alert(1)</script>__Unsafe Name!!',
        guestToken,
      })
      .expect(200);

    expect(response.body.profile.displayName).not.toContain('<');
    expect(response.body.profile.displayName).not.toContain('>');
    expect(response.body.profile.displayName.length).toBeLessThanOrEqual(20);
  });

  test('Should reject profile access with an invalid guest session secret', async () => {
    const guestToken = 'guest-token-invalid-session';

    await request(gameServer.app)
      .post('/api/profiles/guest')
      .set('x-guest-session-secret', 'guest-session-invalid-session')
      .send({
        displayName: 'Session Owner',
        guestToken,
      })
      .expect(200);

    await request(gameServer.app)
      .post('/api/profiles/guest')
      .send({
        displayName: 'Missing Header',
        guestToken: 'guest-token-missing-header',
      })
      .expect(400);

    await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-token', guestToken)
      .set('x-guest-session-secret', 'invalid-secret')
      .expect(401);
  });

  test('Should cap leaderboard limit to prevent large responses', async () => {
    const totalProfiles = 70;
    const batchSize = 10;

    for (let start = 0; start < totalProfiles; start += batchSize) {
      const batchRequests = [];
      const end = Math.min(start + batchSize, totalProfiles);

      for (let index = start; index < end; index++) {
        batchRequests.push(
          request(gameServer.app)
            .post('/api/profiles/guest')
            .set('x-guest-session-secret', `guest-session-bulk-${index}`)
            .send({
              displayName: `BulkUser${index}`,
              guestToken: `guest-token-bulk-${index}`,
            })
            .expect(200)
        );
      }

      await Promise.all(batchRequests);
    }

    const response = await request(gameServer.app)
      .get('/api/leaderboard')
      .query({ limit: 9999 })
      .expect(200);

    expect(response.body.leaderboard).toEqual([]);
  }, 20000);
});
