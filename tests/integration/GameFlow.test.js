const io = require('socket.io-client');
const GameServer = require('../../server');
const config = require('../../config/config');

config.PORT = 3012;
const SOCKET_URL = `http://localhost:${config.PORT}`;

describe('Integration: Full Match', () => {
    let gameServer;
    let sockets = [];

    beforeAll(async () => {
        gameServer = new GameServer();
        await new Promise(resolve => gameServer.server.listen(config.PORT, resolve));
    });

    afterAll(async () => {
        sockets.forEach(s => s.disconnect());
        await new Promise(resolve => gameServer.server.close(resolve));
    });

    test('End-to-End Match: Winner Found', (done) => {
        const host = io(SOCKET_URL, { transports: ['websocket'] });
        const guest = io(SOCKET_URL, { transports: ['websocket'] });
        sockets.push(host, guest);

        host.on('party_created', (data) => {
            guest.emit('join_party', { partyCode: data.party.code, playerName: 'Guest' });
        });

        guest.on('party_joined', () => {
            host.emit('start_game');
        });

        host.on('game_started', () => {
            host.emit('set_ready', { secretNumber: 10 });
            guest.emit('set_ready', { secretNumber: 40 });
        });

        host.on('playing_started', () => {
            // Gameplay
            // 1. Host guesses wrong
            host.emit('make_guess', { guess: 50 });
        });

        host.on('guess_result', (data) => {
            if (!data.isCorrect) {
                // 2. Guest guesses correct
                guest.emit('make_guess', { guess: 10 });
            }
        });

        guest.on('round_ended', (data) => {
            expect(data.roundResult.winner.name).toBe('Guest');
            done();
        });

        host.emit('create_party', { playerName: 'Host' });
    }, 15000);
});
