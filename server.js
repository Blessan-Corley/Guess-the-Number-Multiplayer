const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

const config = require('./config/config');
const SocketService = require('./src/services/SocketService');
const PartyService = require('./src/services/PartyService');

class GameServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });
        
        this.partyService = new PartyService();
        this.socketService = new SocketService(this.io, this.partyService);
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.setupCleanupIntervals();
    }

    setupMiddleware() {
        
        this.app.use(helmet({
            contentSecurityPolicy: false 
        }));
        
        
        this.app.use(cors());
        
        
        this.app.use(compression());
        
        
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        
        this.app.use(express.static(path.join(__dirname, 'public'), {
            maxAge: config.NODE_ENV === 'production' ? '1d' : 0,
            etag: true
        }));

        
        const apiLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, 
            max: 100, 
            standardHeaders: true,
            legacyHeaders: false,
            message: { error: 'Too many requests, please try again later.' }
        });

        this.app.use('/api/', apiLimiter);
        
        
        this.app.use((req, res, next) => {
            
            next();
        });
    }

    setupRoutes() {
        
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        
        this.app.get('/api/health', async (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                activeParties: await this.partyService.getActivePartiesCount(),
                activePlayers: await this.partyService.getActivePlayersCount()
            });
        });

        this.app.get('/api/stats', async (req, res) => {
            res.json({
                totalParties: this.partyService.getTotalPartiesCreated(),
                activeParties: await this.partyService.getActivePartiesCount(),
                totalPlayers: this.partyService.getTotalPlayersCount(),
                activePlayers: await this.partyService.getActivePlayersCount(),
                gamesCompleted: this.partyService.getGamesCompletedCount()
            });
        });

        
        this.app.post('/api/validate-party', async (req, res) => {
            const { partyCode } = req.body;
            const party = await this.partyService.getParty(partyCode);
            
            if (!party) {
                return res.status(404).json({ error: 'Party not found' });
            }
            
            if (party.players.size >= 2) {
                return res.status(400).json({ error: 'Party is full' });
            }
            
            res.json({ valid: true, party: party.getPublicInfo() });
        });

        this.app.get('/api/config', (req, res) => {
            res.json(require('./config/shared'));
        });

        
        // At the bottom of setupRoutes()
        this.app.use((req, res, next) => {
        if (req.path.startsWith('/google') && req.path.endsWith('.html')) {
            // Let express.static try again
            return res.sendFile(path.join(__dirname, 'public', req.path));
        }
        res.status(404).json({ error: 'Route not found' });
        });

        
        this.app.use((err, req, res, next) => {
            
            res.status(500).json({ 
                error: 'Internal server error',
                message: config.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            
            
            
            this.socketService.handleConnection(socket);
            
            socket.on('disconnect', (reason) => {
                
                this.socketService.handleDisconnection(socket, reason);
            });
            
            socket.on('error', (error) => {
                
            });
        });
    }

    setupCleanupIntervals() {
        
        setInterval(async () => {
            const cleaned = await this.partyService.cleanupInactiveParties();
            if (cleaned > 0) {
                console.log(`[${new Date().toISOString()}] Cleaned up ${cleaned} inactive parties`);
            }
        }, config.CLEANUP_INTERVAL);

        
        setInterval(async () => {
            const stats = {
                activeParties: await this.partyService.getActivePartiesCount(),
                activePlayers: await this.partyService.getActivePlayersCount(),
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            };
            
        }, 600000); 
    }

    start() {
        const port = config.PORT;
        this.httpServer = this.server.listen(port, () => {
            console.log(`
╔══════════════════════════════════════════════════════╗
║             🚀 NUMBER GUESSER SERVER                 ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  📡 Status:   ONLINE                                 ║
║  🔌 Port:     ${port}                                   ║
║  🌍 Env:      ${config.NODE_ENV}                    ║
║  🎮 Mode:     Multiplayer & Single Player            ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`);
        });

        
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            this.server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received. Shutting down gracefully...');
            this.server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });

        
        process.on('uncaughtException', (err) => {
            console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
            process.exit(1);
        });
    }

    stop() {
        if (this.httpServer) {
            this.httpServer.close();
        }
        this.socketService.cleanup();
    }
}


if (require.main === module) {
    const gameServer = new GameServer();
    gameServer.start();
}

module.exports = GameServer;