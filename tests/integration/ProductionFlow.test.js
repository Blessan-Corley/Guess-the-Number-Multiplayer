const io = require('socket.io-client');
const http = require('http');
const GameServer = require('../../server');

jest.setTimeout(30000);

describe('Production Readiness: Logic & Connectivity', () => {
  let gameServer;
  let serverPort;
  let sockets = [];

  const createSocket = (port) =>
    new Promise((resolve, reject) => {
      const socket = io(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true,
      });
      socket.on('connect', () => {
        sockets.push(socket);
        resolve(socket);
      });
      socket.on('connect_error', reject);
    });

  const httpGet = (url) =>
    new Promise((resolve, reject) => {
      http
        .get(url, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        })
        .on('error', reject);
    });

  beforeAll(async () => {
    gameServer = new GameServer();
    const httpServer = await gameServer.listen(0);
    serverPort = httpServer.address().port;
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await gameServer.stop();
  });

  test('Logic: Competitive attempts tracking', async () => {
    const host = await createSocket(serverPort);
    const guest = await createSocket(serverPort);

    const hostData = await new Promise((resolve) => {
      host.emit('create_party', { playerName: 'Host' });
      host.on('party_created', resolve);
    });
    const partyCode = hostData.party.code;

    await new Promise((resolve) => {
      guest.emit('join_party', { partyCode, playerName: 'Guest' });
      guest.on('party_joined', resolve);
    });

    host.emit('start_game');
    await new Promise((resolve) => guest.on('game_started', resolve));

    host.emit('set_ready', { secretNumber: 10 });
    guest.emit('set_ready', { secretNumber: 40 });
    await new Promise((resolve) => host.on('playing_started', resolve));

    const opponentFinishedPromise = new Promise((resolve) =>
      host.on('opponent_finished_first', resolve)
    );
    guest.emit('make_guess', { guess: 10 });

    const finishData = await opponentFinishedPromise;
    expect(finishData.attemptsToTie).toBe(1);
  });

  test('API: Config integrity check', async () => {
    const serverConfig = await httpGet(`http://localhost:${serverPort}/api/config`);
    expect(serverConfig.GAME_MESSAGES.TOO_HIGH).toBeDefined();
    expect(Array.isArray(serverConfig.GAME_MESSAGES.TOO_HIGH)).toBe(true);
  });
});
