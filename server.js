const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

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
        
        
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        
        this.app.use((req, res, next) => {
            
            next();
        });
    }

    setupRoutes() {
        
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                activeParties: this.partyService.getActivePartiesCount(),
                activePlayers: this.partyService.getActivePlayersCount()
            });
        });

        this.app.get('/api/stats', (req, res) => {
            res.json({
                totalParties: this.partyService.getTotalPartiesCreated(),
                activeParties: this.partyService.getActivePartiesCount(),
                totalPlayers: this.partyService.getTotalPlayersCount(),
                activePlayers: this.partyService.getActivePlayersCount(),
                gamesCompleted: this.partyService.getGamesCompletedCount()
            });
        });

        
        this.app.post('/api/validate-party', (req, res) => {
            const { partyCode } = req.body;
            const party = this.partyService.getParty(partyCode);
            
            if (!party) {
                return res.status(404).json({ error: 'Party not found' });
            }
            
            if (party.players.size >= 2) {
                return res.status(400).json({ error: 'Party is full' });
            }
            
            res.json({ valid: true, party: party.getPublicInfo() });
        });

        
        this.app.use((req, res) => {
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
        
        setInterval(() => {
            const cleaned = this.partyService.cleanupInactiveParties();
            if (cleaned > 0) {
                
            }
        }, config.CLEANUP_INTERVAL);

        
        setInterval(() => {
            const stats = {
                activeParties: this.partyService.getActivePartiesCount(),
                activePlayers: this.partyService.getActivePlayersCount(),
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            };
            
        }, 600000); 
    }

    start() {
        const port = config.PORT;
        this.server.listen(port, () => {
            
            
            
            
        });

        
        process.on('SIGTERM', () => {
            
            this.server.close(() => {
                
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            
            this.server.close(() => {
                
                process.exit(0);
            });
        });

        
        process.on('uncaughtException', (err) => {
            
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            
            process.exit(1);
        });
    }
}


const gameServer = new GameServer();
gameServer.start();