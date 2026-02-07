const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIo = require('socket.io');
require('dotenv').config();

const config = require('./config/config');
const logger = require('./src/lib/logger');
const Database = require('./src/lib/database');
const createServices = require('./src/app/createServices');
const registerConfigRoutes = require('./src/http/routes/configRoutes');
const registerHealthRoutes = require('./src/http/routes/healthRoutes');
const registerStatsRoutes = require('./src/http/routes/statsRoutes');
const registerProfileRoutes = require('./src/http/routes/profileRoutes');
const registerPartyRoutes = require('./src/http/routes/partyRoutes');
const { createErrorHandler } = require('./src/http/middleware/errorHandler');

const allowAllOrigins = (origins) => origins.includes('*');
const buildCorsOrigin = (origins) => {
  if (allowAllOrigins(origins) || origins.length === 0) {
    return true;
  }

  return origins;
};

class GameServer {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: buildCorsOrigin(config.SOCKET_CORS_ORIGINS),
        methods: ['GET', 'POST'],
      },
      pingTimeout: config.PING_TIMEOUT,
      pingInterval: config.PING_INTERVAL,
    });

    this.store = options.store || null;
    this.databaseUrl = options.databaseUrl || null;
    this.database =
      options.database ||
      new Database({
        logger: this.logger,
        connectionString: this.databaseUrl,
      });
    this.partyService = null;
    this.profileService = null;
    this.persistenceService = null;
    this.socketService = null;
    this.cleanupHandles = [];
    this.httpServer = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.ready = this.initialize();
  }

  async initialize() {
    if (process.env.NODE_APP_INSTANCE && parseInt(process.env.NODE_APP_INSTANCE, 10) > 0) {
      this.logger.warn(
        'Running as a cluster worker (NODE_APP_INSTANCE > 0). ' +
          'In-process party locks and timers are NOT shared across workers. ' +
          'See docs/DEPLOYMENT.md for safe deployment options.'
      );
    }

    const validation = config.validate();
    validation.warnings.forEach((warning) => this.logger.warn(warning));

    if (validation.errors.length > 0) {
      throw new Error(`Invalid configuration: ${validation.errors.join(' ')}`);
    }

    const services = await createServices({
      logger: this.logger,
      io: this.io,
      store: this.store,
      database: this.database,
      databaseUrl: this.databaseUrl,
    });

    this.store = services.store;
    this.database = services.database;
    this.partyService = services.partyService;
    this.profileService = services.profileService;
    this.persistenceService = services.persistenceService;
    this.socketService = services.socketService;
    this.setupCleanupIntervals();
  }

  setupMiddleware() {
    this.app.disable('x-powered-by');

    if (config.TRUST_PROXY) {
      this.app.set('trust proxy', config.TRUST_PROXY);
    }

    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
              "'self'",
              'https://unpkg.com',
              'https://cdn.jsdelivr.net',
              "'sha256-B0OgqBjBNq43pj2ezcUISqijIaN2QA9H819Z1oJj++U='",
            ],
            styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            connectSrc: ["'self'", 'ws:', 'wss:', 'https://unpkg.com', 'https://cdn.jsdelivr.net'],
            imgSrc: ["'self'", 'data:'],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    this.app.use(
      cors({
        origin: buildCorsOrigin(config.CORS_ORIGINS),
        credentials: false,
      })
    );

    // Gzip/deflate for responses > 1 KB.
    // Brotli is best applied at the reverse-proxy layer (Nginx, Caddy, Cloudflare).
    this.app.use(
      compression({
        level: 6, // balanced speed/ratio
        threshold: 1024, // skip tiny responses
        filter(req, res) {
          // Never compress already-compressed assets (images, woff2, etc.)
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        },
      })
    );
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    const apiLimiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    });

    // Higher limit for frequently-polled read-only endpoints to avoid 429s during gameplay
    const profileLimiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX * 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later.' },
    });

    this.app.use('/api/profile', profileLimiter);
    this.app.use('/api/leaderboard', profileLimiter);
    this.app.use('/api/', apiLimiter);
    // Serve the Vite production build when it exists; fall back to public/ in dev.
    const distDir = path.join(__dirname, 'dist');
    const publicDir = path.join(__dirname, 'public');
    const staticDir = fs.existsSync(distDir) ? distDir : publicDir;
    this.app.use(
      express.static(staticDir, {
        maxAge: config.NODE_ENV === 'production' ? '1d' : 0,
        etag: true,
      })
    );
    // Also serve public/ as fallback for non-bundled assets (e.g. theme.js, app-config.js)
    if (staticDir !== publicDir) {
      this.app.use(express.static(publicDir, { maxAge: 0, etag: true }));
    }

    this.app.use((req, res, next) => {
      req.requestStart = Date.now();
      next();
    });
  }

  withReady(handler) {
    return async (req, res, next) => {
      try {
        await this.ready;
        return await handler(req, res, next);
      } catch (error) {
        return next(error);
      }
    };
  }

  setupRoutes() {
    registerConfigRoutes(this);
    registerHealthRoutes(this);
    registerStatsRoutes(this);
    registerProfileRoutes(this);
    registerPartyRoutes(this);

    this.app.use((req, res) => {
      if (req.path.startsWith('/google') && req.path.endsWith('.html')) {
        const distFile = path.join(__dirname, 'dist', req.path);
        const publicFile = path.join(__dirname, 'public', req.path);
        const filePath = fs.existsSync(distFile) ? distFile : publicFile;
        return res.sendFile(filePath);
      }

      return res.status(404).json({ error: 'Route not found' });
    });

    this.app.use(createErrorHandler(this.logger));
  }

  setupSocketHandlers() {
    this.io.on('connection', async (socket) => {
      try {
        await this.ready;
        this.socketService.handleConnection(socket);

        socket.on('disconnect', (reason) => {
          this.socketService.handleDisconnection(socket, reason);
        });

        socket.on('error', (error) => {
          this.socketService.handleSocketError(socket, error);
        });
      } catch (error) {
        this.logger.error(
          { error: error.message, socketId: socket.id },
          'Failed to initialize socket connection'
        );
        socket.emit('error', {
          message: 'Server not ready',
          context: 'bootstrap',
        });
        socket.disconnect(true);
      }
    });
  }

  setupCleanupIntervals() {
    const inactivePartyCleanup = setInterval(async () => {
      const cleaned = await this.partyService.cleanupInactiveParties();
      if (cleaned > 0) {
        this.logger.info({ cleaned }, 'Cleaned up inactive parties');
      }
    }, config.CLEANUP_INTERVAL);

    const metricsHeartbeat = setInterval(async () => {
      this.logger.debug(
        {
          activeParties: await this.partyService.getActivePartiesCount(),
          activePlayers: await this.partyService.getActivePlayersCount(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime(),
        },
        'Server heartbeat'
      );
    }, 600000);

    [inactivePartyCleanup, metricsHeartbeat].forEach((handle) => {
      if (typeof handle.unref === 'function') {
        handle.unref();
      }
      this.cleanupHandles.push(handle);
    });
  }

  async listen(port = config.PORT) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const httpServer = this.server.listen(port);
      httpServer.once('error', reject);
      httpServer.once('listening', () => {
        this.httpServer = httpServer;
        this.logger.info(
          {
            port,
            environment: config.NODE_ENV,
            storeMode: config.STORE_MODE,
            databaseEnabled: this.database.enabled,
          },
          'NumDuel server started'
        );
        resolve(this.httpServer);
      });
    });
  }

  start() {
    this.listen().catch((error) => {
      this.logger.error({ error: error.message }, 'Failed to start server');
      process.exit(1);
    });

    process.on('SIGTERM', async () => {
      this.logger.info('SIGTERM received. Shutting down gracefully.');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      this.logger.info('SIGINT received. Shutting down gracefully.');
      await this.stop();
      process.exit(0);
    });

    process.on('uncaughtException', async (err) => {
      this.logger.error({ error: err.message }, 'Uncaught exception');
      await this.stop();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      this.logger.error(
        { reason: reason && reason.message ? reason.message : reason },
        'Unhandled rejection'
      );
      await this.stop();
      process.exit(1);
    });
  }

  async stop() {
    this.cleanupHandles.forEach(clearInterval);
    this.cleanupHandles = [];

    if (this.socketService) {
      this.socketService.cleanup();
    }

    await Promise.allSettled([
      this.store ? this.store.close() : Promise.resolve(),
      this.database ? this.database.close() : Promise.resolve(),
    ]);

    if (this.httpServer) {
      await new Promise((resolve) => this.httpServer.close(resolve));
      this.httpServer = null;
    }
  }
}

if (require.main === module) {
  const gameServer = new GameServer();
  gameServer.start();
}

module.exports = GameServer;
