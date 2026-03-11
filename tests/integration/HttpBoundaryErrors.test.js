const request = require('supertest');
const GameServer = require('../../server');

describe('Integration: HTTP boundary errors', () => {
  let gameServer;

  beforeAll(async () => {
    gameServer = new GameServer();
    await gameServer.ready;
  });

  afterAll(async () => {
    await gameServer.stop();
  });

  test('returns normalized validation error for missing guest token', async () => {
    const response = await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-session-secret', 'secret')
      .expect(400);

    expect(response.body).toMatchObject({
      error: 'Validation failed',
      code: 'INVALID_GUEST_TOKEN',
      message: 'guestToken is required',
    });
  });
});
