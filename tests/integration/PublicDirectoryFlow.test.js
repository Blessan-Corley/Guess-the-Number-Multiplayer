const io = require('socket.io-client');
const request = require('supertest');
const GameServer = require('../../server');

function waitForMatchingEvent(socket, eventName, predicate) {
  return new Promise((resolve) => {
    const handler = (payload) => {
      if (!predicate(payload)) {
        return;
      }

      socket.off(eventName, handler);
      resolve(payload);
    };

    socket.on(eventName, handler);
  });
}

describe('Integration: Public room directory', () => {
  let gameServer;
  let baseUrl;
  let sockets = [];

  beforeAll(async () => {
    gameServer = new GameServer();
    await gameServer.listen(3072);
    baseUrl = 'http://localhost:3072';
  });

  afterAll(async () => {
    sockets.forEach((socket) => socket.disconnect());
    await gameServer.stop();
  });

  test('should expose public rooms through snapshot API and realtime socket updates', async () => {
    const host = io(baseUrl, { transports: ['websocket'], forceNew: true });
    const guest = io(baseUrl, { transports: ['websocket'], forceNew: true });
    const observer = io(baseUrl, { transports: ['websocket'], forceNew: true });
    sockets.push(host, guest, observer);

    const createdPromise = new Promise((resolve) => host.once('party_created', resolve));
    host.emit('create_party', {
      playerName: 'Public Host',
      guestToken: 'guest-token-public-host',
      guestSessionSecret: 'guest-session-public-host',
    });
    const created = await createdPromise;

    const publicEnabledPromise = new Promise((resolve) =>
      host.once('party_visibility_updated', resolve)
    );
    const firstDirectoryUpdatePromise = waitForMatchingEvent(
      observer,
      'public_directory_updated',
      (payload) =>
        Array.isArray(payload?.parties) &&
        payload.parties.some((party) => party.code === created.party.code)
    );
    host.emit('set_party_visibility', { visibility: 'public' });

    const publicEnabled = await publicEnabledPromise;
    const firstDirectoryUpdate = await firstDirectoryUpdatePromise;

    expect(publicEnabled.party.visibility).toBe('public');
    expect(firstDirectoryUpdate.parties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: created.party.code,
          hostName: 'Public Host',
          playerCount: 1,
          joinStatus: 'open',
        }),
      ])
    );
    expect(firstDirectoryUpdate.stats.onlinePlayers).toBeGreaterThanOrEqual(1);

    const snapshotResponse = await request(gameServer.app).get('/api/public-parties').expect(200);

    expect(snapshotResponse.body.parties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: created.party.code,
          hostName: 'Public Host',
          playerCount: 1,
          joinStatus: 'open',
        }),
      ])
    );

    const joinedPromise = new Promise((resolve) => guest.once('party_joined', resolve));
    const secondDirectoryUpdatePromise = waitForMatchingEvent(
      observer,
      'public_directory_updated',
      (payload) =>
        Array.isArray(payload?.parties) &&
        payload.parties.some(
          (party) => party.code === created.party.code && party.playerCount === 2
        )
    );
    guest.emit('join_public_party', {
      partyCode: created.party.code,
      playerName: 'Public Guest',
      guestToken: 'guest-token-public-guest',
      guestSessionSecret: 'guest-session-public-guest',
    });

    await joinedPromise;
    const secondDirectoryUpdate = await secondDirectoryUpdatePromise;

    expect(secondDirectoryUpdate.parties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: created.party.code,
          playerCount: 2,
          joinStatus: 'filled',
        }),
      ])
    );

    const startedPromise = new Promise((resolve) => host.once('game_started', resolve));
    const thirdDirectoryUpdatePromise = waitForMatchingEvent(
      observer,
      'public_directory_updated',
      (payload) =>
        Array.isArray(payload?.parties) &&
        !payload.parties.some((party) => party.code === created.party.code)
    );
    host.emit('start_game');
    await startedPromise;
    const thirdDirectoryUpdate = await thirdDirectoryUpdatePromise;

    expect(
      thirdDirectoryUpdate.parties.find((party) => party.code === created.party.code)
    ).toBeUndefined();
  }, 15000);
});
