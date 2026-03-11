const io = require('socket.io-client');
const GameServer = require('../../server');

describe('Integration: Socket boundary validation', () => {
  let gameServer;
  let socket;

  beforeAll(async () => {
    gameServer = new GameServer();
    await gameServer.listen(3080);
  });

  afterAll(async () => {
    if (socket) {
      socket.disconnect();
    }
    await gameServer.stop();
  });

  test('returns normalized socket error for invalid join payload', async () => {
    socket = io('http://localhost:3080', {
      transports: ['websocket'],
      forceNew: true,
    });

    await new Promise((resolve) => socket.on('connect', resolve));

    const errorPayload = await new Promise((resolve) => {
      socket.emit('join_party', {
        partyCode: 'bad',
        playerName: 'Guest',
      });

      socket.on('error', resolve);
    });

    expect(errorPayload).toMatchObject({
      code: 'INVALID_PARTY_CODE',
      context: 'join_party',
      message: expect.stringContaining('Party code'),
    });
  });
});
