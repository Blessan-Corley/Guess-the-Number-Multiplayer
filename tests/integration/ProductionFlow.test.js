const io = require('socket.io-client');
const http = require('http');
const GameServer = require('../../server');
const config = require('../../config/config');

config.PORT = 3060;
const SOCKET_URL = `http://localhost:${config.PORT}`;

jest.setTimeout(30000);

describe('Production Readiness: Logic & Connectivity', () => {
    let gameServer;
    let sockets = [];

    const createSocket = () => {
        return new Promise((resolve, reject) => {
            const socket = io(SOCKET_URL, { transports: ['websocket'], forceNew: true });
            socket.on('connect', () => {
                sockets.push(socket);
                resolve(socket);
            });
            socket.on('connect_error', reject);
        });
    };

    const httpGet = (url) => {
        return new Promise((resolve, reject) => {
            http.get(url, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(JSON.parse(data)));
            }).on('error', reject);
        });
    };

    beforeAll(async () => {
        gameServer = new GameServer();
        await new Promise(resolve => gameServer.server.listen(config.PORT, resolve));
    });

    afterAll(async () => {
        for (const s of sockets) s.disconnect();
        await new Promise(resolve => gameServer.server.close(resolve));
    });

    test('Logic: Competitive attempts tracking', async () => {
        const host = await createSocket();
        const guest = await createSocket();

        const hostData = await new Promise(resolve => {
            host.emit('create_party', { playerName: 'Host' });
            host.on('party_created', resolve);
        });
        const partyCode = hostData.party.code;

        await new Promise(resolve => {
            guest.emit('join_party', { partyCode, playerName: 'Guest' });
            guest.on('party_joined', resolve);
        });

        host.emit('start_game');
        await new Promise(resolve => guest.on('game_started', resolve));

        host.emit('set_ready', { secretNumber: 10 });
        guest.emit('set_ready', { secretNumber: 40 });
        await new Promise(resolve => host.on('playing_started', resolve));

        // 1. Guest finds it in 1 attempt
        const opponentFinishedPromise = new Promise(resolve => host.on('opponent_finished_first', resolve));
        guest.emit('make_guess', { guess: 10 });
        
        const finishData = await opponentFinishedPromise;
        
        // CHECK: Verify the backend correctly calculates attempts to beat
        // Guest (1 attempt) vs Host (0 attempts)
        // Host needs to find it in exactly 1 attempt to tie, or 0 (impossible) to win.
        // attemptsToTie should be guest.attempts (1)
        expect(finishData.attemptsToTie).toBe(1);
    });

    test('API: Config integrity check', async () => {
        const serverConfig = await httpGet(`${SOCKET_URL}/api/config`);
        expect(serverConfig.GAME_MESSAGES.TOO_HIGH).toBeDefined();
        expect(Array.isArray(serverConfig.GAME_MESSAGES.TOO_HIGH)).toBe(true);
    });
});