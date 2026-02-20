const io = require('socket.io-client');
const request = require('supertest');
const { newDb } = require('pg-mem');
const GameServer = require('../../server');
const Database = require('../../src/lib/database');

describe('Integration: Persistent Match Flow', () => {
  let gameServer;
  let sockets = [];
  let baseUrl;

  beforeAll(async () => {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();
    const database = new Database({
      connectionString: 'postgres://test',
      poolFactory: (poolConfig) => new pgAdapter.Pool(poolConfig),
    });

    gameServer = new GameServer({ database });
    const httpServer = await gameServer.listen(0);
    const port = httpServer.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await gameServer.stop();
  });

  test('Completed multiplayer match should appear in profile history and leaderboard', async () => {
    const hostToken = 'guest-token-host-persist';
    const guestToken = 'guest-token-guest-persist';
    const hostSessionSecret = 'guest-session-host-persist';
    const guestSessionSecret = 'guest-session-guest-persist';
    const host = io(baseUrl, { transports: ['websocket'], forceNew: true });
    const guest = io(baseUrl, { transports: ['websocket'], forceNew: true });
    sockets.push(host, guest);

    const hostCreatedPromise = new Promise((resolve) => host.on('party_created', resolve));
    host.emit('create_party', {
      playerName: 'Host Persist',
      guestToken: hostToken,
      guestSessionSecret: hostSessionSecret,
    });
    const hostCreated = await hostCreatedPromise;

    const joinedPromise = new Promise((resolve) => guest.on('party_joined', resolve));
    guest.emit('join_party', {
      partyCode: hostCreated.party.code,
      playerName: 'Guest Persist',
      guestToken: guestToken,
      guestSessionSecret,
    });
    await joinedPromise;

    const gameStartedPromise = new Promise((resolve) => host.on('game_started', resolve));
    host.emit('start_game');
    await gameStartedPromise;

    const playingPromise = new Promise((resolve) => guest.on('playing_started', resolve));
    host.emit('set_ready', { secretNumber: 12 });
    guest.emit('set_ready', { secretNumber: 44 });
    await playingPromise;

    const hostGuessResultPromise = new Promise((resolve) => host.on('guess_result', resolve));
    host.emit('make_guess', { guess: 20 });
    await hostGuessResultPromise;

    const roundEndedPromise = new Promise((resolve) => guest.on('round_ended', resolve));
    guest.emit('make_guess', { guess: 12 });
    await roundEndedPromise;

    const hostProfileResponse = await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-token', hostToken)
      .set('x-guest-session-secret', hostSessionSecret)
      .expect(200);

    const guestProfileResponse = await request(gameServer.app)
      .get('/api/profile')
      .set('x-guest-token', guestToken)
      .set('x-guest-session-secret', guestSessionSecret)
      .expect(200);

    expect(hostProfileResponse.body.matches).toHaveLength(1);
    expect(guestProfileResponse.body.matches).toHaveLength(1);
    expect(guestProfileResponse.body.profile.totalWins).toBe(1);

    const leaderboardResponse = await request(gameServer.app).get('/api/leaderboard').expect(200);

    const guestEntry = leaderboardResponse.body.leaderboard.find(
      (entry) => entry.guestToken === guestToken
    );
    expect(guestEntry).toBeDefined();
    expect(guestEntry.totalWins).toBe(1);
  }, 15000);

  test('Completed multiplayer match should emit live profile and leaderboard updates', async () => {
    const hostToken = 'guest-token-host-live';
    const guestToken = 'guest-token-guest-live';
    const hostSessionSecret = 'guest-session-host-live';
    const guestSessionSecret = 'guest-session-guest-live';
    const host = io(baseUrl, { transports: ['websocket'], forceNew: true });
    const guest = io(baseUrl, { transports: ['websocket'], forceNew: true });
    sockets.push(host, guest);

    const hostCreatedPromise = new Promise((resolve) => host.once('party_created', resolve));
    host.emit('create_party', {
      playerName: 'Host Live',
      guestToken: hostToken,
      guestSessionSecret: hostSessionSecret,
    });
    const hostCreated = await hostCreatedPromise;

    const joinedPromise = new Promise((resolve) => guest.once('party_joined', resolve));
    guest.emit('join_party', {
      partyCode: hostCreated.party.code,
      playerName: 'Guest Live',
      guestToken: guestToken,
      guestSessionSecret,
    });
    await joinedPromise;

    const gameStartedPromise = new Promise((resolve) => host.once('game_started', resolve));
    host.emit('start_game');
    await gameStartedPromise;

    const playingPromise = new Promise((resolve) => guest.once('playing_started', resolve));
    host.emit('set_ready', { secretNumber: 22 });
    guest.emit('set_ready', { secretNumber: 55 });
    await playingPromise;

    const hostGuessResultPromise = new Promise((resolve) => host.once('guess_result', resolve));
    host.emit('make_guess', { guess: 40 });
    await hostGuessResultPromise;

    const hostProfileUpdatedPromise = new Promise((resolve) =>
      host.once('profile_updated', resolve)
    );
    const guestProfileUpdatedPromise = new Promise((resolve) =>
      guest.once('profile_updated', resolve)
    );
    const leaderboardUpdatedPromise = new Promise((resolve) =>
      guest.once('leaderboard_updated', resolve)
    );
    const roundEndedPromise = new Promise((resolve) => guest.once('round_ended', resolve));

    guest.emit('make_guess', { guess: 22 });
    await roundEndedPromise;

    const [hostProfileUpdated, guestProfileUpdated, leaderboardUpdated] = await Promise.all([
      hostProfileUpdatedPromise,
      guestProfileUpdatedPromise,
      leaderboardUpdatedPromise,
    ]);

    expect(hostProfileUpdated.profile.displayName).toBe('Host Live');
    expect(hostProfileUpdated.matches).toHaveLength(1);

    expect(guestProfileUpdated.profile.displayName).toBe('Guest Live');
    expect(guestProfileUpdated.profile.totalWins).toBe(1);
    expect(guestProfileUpdated.matches).toHaveLength(1);

    const guestEntry = leaderboardUpdated.leaderboard.find(
      (entry) => entry.guestToken === guestToken
    );
    expect(guestEntry).toBeDefined();
    expect(guestEntry.totalWins).toBe(1);
  }, 15000);
});
