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
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false // Allow inline scripts for Socket.IO
        }));
        
        // CORS middleware
        this.app.use(cors());
        
        // Compression middleware
        this.app.use(compression());
        
        // Body parsing middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Static files middleware
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Serve main game page
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        // API Routes
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

        // Handle party code validation
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

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).json({ 
                error: 'Internal server error',
                message: config.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`Player connected: ${socket.id}`);
            
            // Handle all socket events through SocketService
            this.socketService.handleConnection(socket);
            
            socket.on('disconnect', (reason) => {
                console.log(`Player disconnected: ${socket.id}, reason: ${reason}`);
                this.socketService.handleDisconnection(socket, reason);
            });
            
            socket.on('error', (error) => {
                console.error(`Socket error for ${socket.id}:`, error);
            });
        });
    }

    setupCleanupIntervals() {
        // Clean up inactive parties every 5 minutes
        setInterval(() => {
            const cleaned = this.partyService.cleanupInactiveParties();
            if (cleaned > 0) {
                console.log(`Cleaned up ${cleaned} inactive parties`);
            }
        }, config.CLEANUP_INTERVAL);

        // Log server stats every 10 minutes
        setInterval(() => {
            const stats = {
                activeParties: this.partyService.getActivePartiesCount(),
                activePlayers: this.partyService.getActivePlayersCount(),
                memoryUsage: process.memoryUsage(),
                uptime: process.uptime()
            };
            console.log('Server stats:', stats);
        }, 600000); // 10 minutes
    }

    start() {
        const port = config.PORT;
        this.server.listen(port, () => {
            console.log(`🎮 Multiplayer Number Guesser Server running on port ${port}`);
            console.log(`🌐 Environment: ${config.NODE_ENV}`);
            console.log(`🔧 WebSocket enabled with Socket.IO`);
            console.log(`📊 Visit http://localhost:${port} to play!`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully...');
            this.server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully...');
            this.server.close(() => {
                console.log('Server closed');
                process.exit(0);
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}

// Start the server
const gameServer = new GameServer();
gameServer.start();