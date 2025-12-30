const io = require('socket.io-client');
const http = require('http');
const GameServer = require('../../server');
const config = require('../../config/config');

config.PORT = 3052;
const SOCKET_URL = `http://localhost:${config.PORT}`;

jest.setTimeout(30000);

describe('Production Readiness: Real-world Simulation', () => {
    let gameServer;
    let sockets = [];

    const createSocket = () => {
        return new Promise((resolve, reject) => {
            const socket = io(SOCKET_URL, { 
                transports: ['websocket'], 
                forceNew: true,
                reconnection: false 
            });
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
        for (const s of sockets) {
            if (s.connected) s.disconnect();
        }
        await new Promise(resolve => {
            gameServer.server.close(() => {
                gameServer.socketService.cleanup();
                resolve();
            });
        });
    });

    test('Full Flow: Create -> Join -> Start -> Reconnect -> Finish', async () => {
        const host = await createSocket();
        const guest = await createSocket();

        // 1. Setup Party
        const hostCreatedPromise = new Promise(resolve => host.on('party_created', resolve));
        host.emit('create_party', { playerName: 'Host' });
        const hostData = await hostCreatedPromise;
        const partyCode = hostData.party.code;

        const guestJoinedPromise = new Promise(resolve => guest.on('party_joined', resolve));
        guest.emit('join_party', { partyCode, playerName: 'Guest' });
        const guestData = await guestJoinedPromise;
        const guestId = guestData.player.id;

        // 2. Start Game
        const gameStartedPromise = new Promise(resolve => guest.on('game_started', resolve));
        host.emit('start_game');
        await gameStartedPromise;

        // 3. Selection Phase
        const playingStartedPromise = new Promise(resolve => host.on('playing_started', resolve));
        host.emit('set_ready', { secretNumber: 10 });
        guest.emit('set_ready', { secretNumber: 40 });
        await playingStartedPromise;

        // 4. Gameplay: Host guesses wrong once
        await new Promise(resolve => {
            host.once('guess_result', resolve);
            host.emit('make_guess', { guess: 25 });
        });

        // 5. Reconnect Guest
        guest.disconnect();
        const reconnector = await createSocket();
        reconnector.emit('reconnect_attempt', { partyCode, playerId: guestId });
        await new Promise(resolve => reconnector.on('reconnected', resolve));

        // 6. Guest guesses correctly
        // Now Host has 1 attempt (wrong), Guest has 1 attempt (correct). 
        // Guest should win and round should end.
        const roundEndPromise = new Promise(resolve => reconnector.on('round_ended', resolve));
        reconnector.emit('make_guess', { guess: 10 });
        
        const result = await roundEndPromise;
        expect(result.roundResult.winner.name).toBe('Guest');
    });

    test('API Level Check: Health & Config', async () => {
        const health = await httpGet(`${SOCKET_URL}/api/health`);
        expect(health.status).toBe('healthy');

        const serverConfig = await httpGet(`${SOCKET_URL}/api/config`);
        expect(serverConfig.GAME_MESSAGES).toBeDefined();
    });
});
