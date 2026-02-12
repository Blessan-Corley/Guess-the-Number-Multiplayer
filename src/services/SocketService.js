const GameService = require('./GameService');
const config = require('../../config/config');
const partyHandlers = require('./socket/partyHandlers');
const gameplayHandlers = require('./socket/gameplayHandlers');
const SOCKET_EVENTS = require('../contracts/socketEvents');
const socketSchemas = require('../contracts/socketSchemas');
const { normalizeError } = require('../http/middleware/errorHandler');

class SocketService {
  constructor(io, partyService, options = {}) {
    this.io = io;
    this.partyService = partyService;
    this.gameService = new GameService(partyService);
    this.profileService = options.profileService || null;
    this.persistenceService = options.persistenceService || null;
    this.logger = options.logger || console;

    this.selectionTimers = new Map();
    this.finishedPlayers = new Map();
    this.roundLocks = new Map();
    this.rematchVotes = new Map();
    this.rateLimits = new Map();
    this.reconnectTimeouts = new Map();

    this.cleanupInterval = setInterval(() => this.performCleanup(), 60000);
    if (typeof this.cleanupInterval.unref === 'function') {
      this.cleanupInterval.unref();
    }
  }

  handleConnection(socket) {
    this.logger.info({ socketId: socket.id }, 'Socket connected');

    this.registerEventHandlers(socket);

    socket.emit('connected', {
      socketId: socket.id,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
      version: config.APP_VERSION,
    });

    this.emitPublicDirectoryUpdate(socket.id).catch((error) => {
      this.logger.debug(
        { socketId: socket.id, error: error.message },
        'Failed to emit public directory snapshot'
      );
    });
  }

  registerEventHandlers(socket) {
    const handlers = {
      [SOCKET_EVENTS.INBOUND.CREATE_PARTY]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.CREATE_PARTY, () =>
          this.handleCreateParty(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.JOIN_PARTY]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.JOIN_PARTY, () =>
          this.handleJoinParty(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.JOIN_PUBLIC_PARTY]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.JOIN_PUBLIC_PARTY, () =>
          this.handleJoinPublicParty(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.LEAVE_PARTY]: () => this.handleLeaveParty(socket),
      [SOCKET_EVENTS.INBOUND.SET_PARTY_VISIBILITY]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.SET_PARTY_VISIBILITY, () =>
          this.handleSetPartyVisibility(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.UPDATE_SETTINGS]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.UPDATE_SETTINGS, () =>
          this.handleUpdateSettings(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.START_GAME]: () =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.START_GAME, () =>
          this.handleStartGame(socket)
        ),
      [SOCKET_EVENTS.INBOUND.SET_READY]: (data) => this.handleSetReady(socket, data),
      [SOCKET_EVENTS.INBOUND.MAKE_GUESS]: (data) =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.MAKE_GUESS, () =>
          this.handleMakeGuess(socket, data)
        ),
      [SOCKET_EVENTS.INBOUND.NEXT_ROUND]: () =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.NEXT_ROUND, () =>
          this.handleNextRound(socket)
        ),
      [SOCKET_EVENTS.INBOUND.REMATCH]: () =>
        this.handleWithRateLimit(socket, SOCKET_EVENTS.INBOUND.REMATCH, () =>
          this.handleRematch(socket)
        ),
      [SOCKET_EVENTS.INBOUND.REQUEST_SETTINGS_CHANGE]: () =>
        this.handleSettingsChangeRequest(socket),
      [SOCKET_EVENTS.INBOUND.PLAYER_TYPING]: (data) => this.handlePlayerTyping(socket, data),
      [SOCKET_EVENTS.INBOUND.HEARTBEAT]: (data) => this.handleHeartbeat(socket, data),
      [SOCKET_EVENTS.INBOUND.RECONNECT_ATTEMPT]: (data) =>
        this.handleReconnectAttempt(socket, data),
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, async (data) => {
        try {
          const validatedPayload = socketSchemas.validatePayload(event, data);
          await handler(validatedPayload);
        } catch (error) {
          this.logger.error(
            { socketId: socket.id, event, error: error.message },
            'Socket event failed'
          );
          this.sendError(socket, error, event);
        }
      });
    });

    socket.on(SOCKET_EVENTS.OUTBOUND.ERROR, (error) => this.handleSocketError(socket, error));
  }

  async handleWithRateLimit(socket, action, handler) {
    const key = `${socket.id}_${action}`;
    const now = Date.now();
    const lastAction = this.rateLimits.get(key);

    const cooldowns = {
      create_party: 5000,
      join_party: 2000,
      join_public_party: 2000,
      make_guess: 200,
      start_game: 3000,
      rematch: 2000,
      update_settings: 1000,
      set_party_visibility: 1000,
    };

    const cooldown = cooldowns[action] || 1000;

    if (lastAction && now - lastAction < cooldown) {
      const remaining = Math.ceil((cooldown - (now - lastAction)) / 1000);
      throw new Error(`Please wait ${remaining} seconds before ${action.replace(/_/g, ' ')}`);
    }

    this.rateLimits.set(key, now);
    return handler();
  }

  async handleCreateParty(socket, data) {
    return partyHandlers.handleCreateParty.call(this, socket, data);
  }

  async handleJoinParty(socket, data) {
    return partyHandlers.handleJoinParty.call(this, socket, data);
  }

  async handleJoinPublicParty(socket, data) {
    return partyHandlers.handleJoinPublicParty.call(this, socket, data);
  }

  async handleLeaveParty(socket, silent = false) {
    return partyHandlers.handleLeaveParty.call(this, socket, silent);
  }

  async handleSetPartyVisibility(socket, data) {
    return partyHandlers.handleSetPartyVisibility.call(this, socket, data);
  }

  async handleUpdateSettings(socket, data) {
    return partyHandlers.handleUpdateSettings.call(this, socket, data);
  }

  async handleStartGame(socket) {
    return partyHandlers.handleStartGame.call(this, socket);
  }

  async handleSetReady(socket, data) {
    return gameplayHandlers.handleSetReady.call(this, socket, data);
  }

  async handleMakeGuess(socket, data) {
    return gameplayHandlers.handleMakeGuess.call(this, socket, data);
  }

  async handlePlayerFinished(party, player, opponent, finishedSet) {
    return gameplayHandlers.handlePlayerFinished.call(this, party, player, opponent, finishedSet);
  }

  async determineWinnerAndEndRound(party, finishedSet) {
    return gameplayHandlers.determineWinnerAndEndRound.call(this, party, finishedSet);
  }

  async endRoundEarly(party, winnerId, reason) {
    return gameplayHandlers.endRoundEarly.call(this, party, winnerId, reason);
  }

  async endRound(party, winnerId, additionalData = {}) {
    return gameplayHandlers.endRound.call(this, party, winnerId, additionalData);
  }

  async broadcastProgressUpdates(party) {
    return gameplayHandlers.broadcastProgressUpdates.call(this, party);
  }

  async handleNextRound(socket) {
    return gameplayHandlers.handleNextRound.call(this, socket);
  }

  async handleRematch(socket) {
    return gameplayHandlers.handleRematch.call(this, socket);
  }

  async handleSettingsChangeRequest(socket) {
    return partyHandlers.handleSettingsChangeRequest.call(this, socket);
  }

  async handlePlayerTyping(socket, data) {
    return partyHandlers.handlePlayerTyping.call(this, socket, data);
  }

  async handleHeartbeat(socket, data) {
    return partyHandlers.handleHeartbeat.call(this, socket, data);
  }

  async handleReconnectAttempt(socket, data) {
    return partyHandlers.handleReconnectAttempt.call(this, socket, data);
  }

  handleSocketError(socket, error) {
    this.logger.error({ socketId: socket.id, error: error.message || error }, 'Socket error');
    this.sendError(socket, error, 'socket_error');
  }

  async handleDisconnection(socket, reason) {
    return partyHandlers.handleDisconnection.call(this, socket, reason);
  }

  startSelectionTimer(party) {
    return gameplayHandlers.startSelectionTimer.call(this, party);
  }

  clearSelectionTimer(partyCode) {
    return gameplayHandlers.clearSelectionTimer.call(this, partyCode);
  }

  async startPlayingPhase(party) {
    return gameplayHandlers.startPlayingPhase.call(this, party);
  }

  sendError(socket, message, context = 'general') {
    const normalized =
      typeof message === 'string'
        ? {
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message,
            label: 'Internal server error',
          }
        : normalizeError(message);

    socket.emit(SOCKET_EVENTS.OUTBOUND.ERROR, {
      message: normalized.message,
      code: normalized.code,
      context,
      timestamp: Date.now(),
    });
  }

  async emitPublicDirectoryUpdate(targetSocketId = null) {
    const [parties, stats] = await Promise.all([
      this.partyService.listPublicParties(),
      this.partyService.getPublicLobbyStats(),
    ]);

    const payload = {
      parties,
      stats,
      timestamp: Date.now(),
    };

    if (targetSocketId) {
      this.io.to(targetSocketId).emit('public_directory_updated', payload);
      return payload;
    }

    this.io.emit('public_directory_updated', payload);
    return payload;
  }

  performCleanup() {
    const now = Date.now();
    const RATE_LIMIT_TTL = 300000; // 5 min
    const REMATCH_TTL = 120000; // 2 min

    for (const [key, timestamp] of this.rateLimits.entries()) {
      if (now - timestamp > RATE_LIMIT_TTL) {
        this.rateLimits.delete(key);
      }
    }

    // Remove finished-player sets for parties no longer in selection/round
    for (const [partyCode] of this.finishedPlayers.entries()) {
      if (!this.selectionTimers.has(partyCode) && !this.roundLocks.has(partyCode)) {
        this.finishedPlayers.delete(partyCode);
      }
    }

    // Remove stale rematch vote entries
    for (const [partyCode, votes] of this.rematchVotes.entries()) {
      if (votes._timestamp && now - votes._timestamp > REMATCH_TTL) {
        this.rematchVotes.delete(partyCode);
      }
    }

    this.logger.debug(
      {
        rateLimitEntries: this.rateLimits.size,
        finishedPlayers: this.finishedPlayers.size,
        rematchVotes: this.rematchVotes.size,
        selectionTimers: this.selectionTimers.size,
      },
      'Socket cleanup completed'
    );
  }

  cleanup() {
    this.selectionTimers.forEach((timer) => clearInterval(timer));
    this.selectionTimers.clear();

    this.reconnectTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.reconnectTimeouts.clear();

    this.finishedPlayers.clear();
    this.roundLocks.clear();
    this.rematchVotes.clear();
    this.rateLimits.clear();

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.logger.info('SocketService cleanup completed');
  }
}

module.exports = SocketService;
