const io = require('socket.io-client');
const GameServer = require('../../server');

jest.setTimeout(25000);

describe('Integration: Full Match', () => {
  let gameServer;
  let serverPort;

  const waitForEvent = (socket, event, timeout = 8000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout waiting for event: ${event}`)),
        timeout
      );
      socket.once(event, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

  const makeSocket = () =>
    io(`http://localhost:${serverPort}`, { transports: ['websocket'], forceNew: true });

  beforeAll(async () => {
    gameServer = new GameServer();
    const httpServer = await gameServer.listen(0);
    serverPort = httpServer.address().port;
  });

  afterAll(async () => {
    await gameServer.stop();
  });

  test('Guest wins when they guess correctly first', async () => {
    const host = makeSocket();
    const guest = makeSocket();
    try {
      host.emit('create_party', { playerName: 'Host' });
      const { party } = await waitForEvent(host, 'party_created');

      guest.emit('join_party', { partyCode: party.code, playerName: 'Guest' });
      await waitForEvent(guest, 'party_joined');

      host.emit('start_game');
      await waitForEvent(host, 'game_started');

      // host secret=10 (what guest must guess), guest secret=40 (what host must guess)
      host.emit('set_ready', { secretNumber: 10 });
      guest.emit('set_ready', { secretNumber: 40 });
      await waitForEvent(host, 'playing_started');

      host.emit('make_guess', { guess: 50 }); // wrong — host used 1 attempt
      await waitForEvent(host, 'guess_result');

      // Guest guesses host's secret correctly → guest finishes first
      // canOpponentWin = host.attempts(1) < guest.attempts(1)? → 1<1 is false → endRoundEarly fires
      // So round_ended fires immediately to both
      const roundEndedPromise = waitForEvent(guest, 'round_ended');
      guest.emit('make_guess', { guess: 10 }); // correct — guest wins
      const roundResult = await roundEndedPromise;
      expect(roundResult.roundResult.winner.name).toBe('Guest');
    } finally {
      host.disconnect();
      guest.disconnect();
    }
  });

  test('Host wins: host finishes first, guest exceeds attempts', async () => {
    const host = makeSocket();
    const guest = makeSocket();
    try {
      host.emit('create_party', { playerName: 'HostWin' });
      const { party } = await waitForEvent(host, 'party_created');

      guest.emit('join_party', { partyCode: party.code, playerName: 'GuestLose' });
      await waitForEvent(guest, 'party_joined');

      host.emit('start_game');
      await waitForEvent(host, 'game_started');

      // host secret=99, guest secret=7
      host.emit('set_ready', { secretNumber: 99 });
      guest.emit('set_ready', { secretNumber: 7 });
      await waitForEvent(host, 'playing_started');

      // Host guesses guest's secret immediately → finishedSet.size=1
      // canOpponentWin: guest.attempts(0) < host.attempts(1) → true
      // → opponent_finished_first fires to guest, waiting_for_opponent fires to host
      const opponentFinishedPromise = waitForEvent(guest, 'opponent_finished_first');
      host.emit('make_guess', { guess: 7 }); // correct
      await opponentFinishedPromise;

      // Guest now makes a guess. guest.attempts becomes 1.
      // finishedSet.has(opponent=host) is true AND guest.attempts(1) >= host.attempts(1) → endRoundEarly → round_ended
      const roundEndedPromise = waitForEvent(guest, 'round_ended');
      guest.emit('make_guess', { guess: 50 }); // wrong — exceeds host's attempts
      const roundResult = await roundEndedPromise;
      expect(roundResult.roundResult.winner.name).toBe('HostWin');
    } finally {
      host.disconnect();
      guest.disconnect();
    }
  });

  test('Party is closed when host leaves lobby', async () => {
    const host = makeSocket();
    const guest = makeSocket();
    try {
      host.emit('create_party', { playerName: 'HostLeave' });
      const { party } = await waitForEvent(host, 'party_created');

      guest.emit('join_party', { partyCode: party.code, playerName: 'GuestWait' });
      await waitForEvent(guest, 'party_joined');

      // When host leaves, guest receives party_closed_host_left
      const closedPromise = waitForEvent(guest, 'party_closed_host_left');
      host.emit('leave_party');
      await closedPromise;
    } finally {
      host.disconnect();
      guest.disconnect();
    }
  });
});
