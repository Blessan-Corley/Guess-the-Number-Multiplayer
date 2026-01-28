const GameService = require('./GameService');
const config = require('../../config/config');

class SocketService {
    constructor(io, partyService) {
        this.io = io;
        this.partyService = partyService;
        this.gameService = new GameService(partyService);
        
        // Enhanced state management
        this.selectionTimers = new Map();
        this.finishedPlayers = new Map(); // partyCode -> Set of playerIds
        this.roundLocks = new Map(); // Prevent race conditions
        this.rateLimits = new Map(); // Rate limiting per socket
        this.reconnectTimeouts = new Map(); // Grace period for reconnections
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => this.performCleanup(), 60000);
    }

    handleConnection(socket) {
        console.log(`[${new Date().toISOString()}] Socket connected: ${socket.id}`);
        
        this.registerEventHandlers(socket);
        
        socket.emit('connected', {
            socketId: socket.id,
            timestamp: Date.now(),
            serverTime: new Date().toISOString(),
            version: '1.0.0'
        });
    }

    registerEventHandlers(socket) {
        // Wrap all handlers with error catching and rate limiting
        const handlers = {
            'create_party': (data) => this.handleWithRateLimit(socket, 'create_party', () => this.handleCreateParty(socket, data)),
            'join_party': (data) => this.handleWithRateLimit(socket, 'join_party', () => this.handleJoinParty(socket, data)),
            'leave_party': () => this.handleLeaveParty(socket),
            'update_settings': (data) => this.handleWithRateLimit(socket, 'update_settings', () => this.handleUpdateSettings(socket, data)),
            'start_game': () => this.handleWithRateLimit(socket, 'start_game', () => this.handleStartGame(socket)),
            'set_ready': (data) => this.handleSetReady(socket, data),
            'make_guess': (data) => this.handleWithRateLimit(socket, 'make_guess', () => this.handleMakeGuess(socket, data)),
            'next_round': () => this.handleWithRateLimit(socket, 'next_round', () => this.handleNextRound(socket)),
            'rematch': () => this.handleWithRateLimit(socket, 'rematch', () => this.handleRematch(socket)),
            'request_settings_change': () => this.handleSettingsChangeRequest(socket),
            'player_typing': (data) => this.handlePlayerTyping(socket, data),
            'heartbeat': () => this.handleHeartbeat(socket),
            'reconnect_attempt': (data) => this.handleReconnectAttempt(socket, data)
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, async (data) => {
                try {
                    await handler(data);
                } catch (error) {
                    console.error(`[${new Date().toISOString()}] Error in ${event}:`, error);
                    this.sendError(socket, error.message, event);
                }
            });
        });

        socket.on('error', (error) => this.handleSocketError(socket, error));
    }

    // Rate limiting wrapper
    async handleWithRateLimit(socket, action, handler) {
        const key = `${socket.id}_${action}`;
        const now = Date.now();
        const lastAction = this.rateLimits.get(key);
        
        const cooldowns = {
            'create_party': 5000,
            'join_party': 2000,
            'make_guess': 500,
            'start_game': 3000,
            'rematch': 2000,
            'update_settings': 1000
        };
        
        const cooldown = cooldowns[action] || 1000;
        
        if (lastAction && (now - lastAction) < cooldown) {
            const remaining = Math.ceil((cooldown - (now - lastAction)) / 1000);
            throw new Error(`Please wait ${remaining} seconds before ${action.replace(/_/g, ' ')}`);
        }
        
        this.rateLimits.set(key, now);
        return handler();
    }

    async handleCreateParty(socket, data) {
        const { playerName } = data;

        // Validation
        const nameValidation = this.partyService.validatePlayerName(playerName);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }

        // Check existing party
        if (await this.partyService.isSocketInParty(socket.id)) {
            // Auto-leave existing party
            await this.handleLeaveParty(socket, true);
        }

        const party = await this.partyService.createParty(socket.id, nameValidation.name);
        socket.join(party.code);

        console.log(`[${new Date().toISOString()}] Party created: ${party.code} by ${nameValidation.name}`);

        socket.emit('party_created', {
            party: party.getPublicInfo(),
            player: party.getPlayer(party.hostId).getPrivateInfo()
        });
    }

    async handleJoinParty(socket, data) {
        const { partyCode, playerName } = data;

        // Validation
        const codeValidation = this.partyService.validatePartyCode(partyCode);
        if (!codeValidation.valid) {
            throw new Error(codeValidation.error);
        }

        const nameValidation = this.partyService.validatePlayerName(playerName);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }

        const party = await this.partyService.getParty(partyCode.toUpperCase());
        if (!party) {
            const error = new Error('Party not found');
            error.type = 'not_found';
            throw error;
        }

        if (party.isFull()) {
            const error = new Error('Party is full (maximum 2 players)');
            error.type = 'party_full';
            throw error;
        }

        // Check if already in another party
        if (await this.partyService.isSocketInParty(socket.id)) {
            await this.handleLeaveParty(socket, true);
        }

        const result = await this.partyService.joinParty(
            partyCode.toUpperCase(),
            socket.id,
            nameValidation.name
        );

        socket.join(result.party.code);

        console.log(`[${new Date().toISOString()}] Player ${nameValidation.name} joined party ${result.party.code}`);

        // Notify existing players
        socket.to(result.party.code).emit('player_joined', {
            party: result.party.getPublicInfo(),
            newPlayer: result.player.getPublicInfo()
        });

        // Confirm to joining player
        socket.emit('party_joined', {
            party: result.party.getPublicInfo(),
            player: result.player.getPrivateInfo()
        });
    }

    async handleLeaveParty(socket, silent = false) {
        const result = await this.partyService.leaveParty(socket.id);
        if (!result) return;

        const { party, player, partyCode, wasHost } = result;

        socket.leave(partyCode);

        // Cleanup player from finished set
        if (this.finishedPlayers.has(partyCode)) {
            this.finishedPlayers.get(partyCode).delete(player.id);
            if (this.finishedPlayers.get(partyCode).size === 0) {
                this.finishedPlayers.delete(partyCode);
            }
        }

        console.log(`[${new Date().toISOString()}] Player ${player.name} left party ${partyCode}`);

        if (wasHost || player.isHost) {
            // Host left - close party
            this.io.to(partyCode).emit('party_closed_host_left', {
                hostName: player.name,
                message: `Party closed - ${player.name} (host) left`
            });
            
            this.clearSelectionTimer(partyCode);
            this.roundLocks.delete(partyCode);
        } else if (!party.isEmpty() && party.gameState.phase === 'playing') {
            // Player left during game - opponent wins
            const remainingPlayer = Array.from(party.players.values())[0];
            
            this.io.to(partyCode).emit('game_ended_by_leave', {
                winner: remainingPlayer.getPublicInfo(),
                leftPlayer: player.getPublicInfo(),
                message: `${player.name} left. ${remainingPlayer.name} wins!`
            });
            
            party.gameState.phase = 'results';
            await this.partyService.saveParty(party);
        } else if (!party.isEmpty()) {
            // Normal leave
            socket.to(partyCode).emit('player_left', {
                party: party.getPublicInfo(),
                leftPlayer: player.getPublicInfo()
            });
        }

        if (!silent) {
            socket.emit('party_left', { partyCode });
        }

        // Final cleanup if party empty
        if (party.isEmpty()) {
            this.clearSelectionTimer(partyCode);
            this.finishedPlayers.delete(partyCode);
            this.roundLocks.delete(partyCode);
        }
    }

    async handleUpdateSettings(socket, data) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player || !player.isHost) {
            throw new Error('Only host can update settings');
        }

        if (party.gameState.phase !== 'lobby') {
            throw new Error('Cannot update settings during active game');
        }

        const updatedSettings = party.updateSettings(data, player.id);
        await this.partyService.saveParty(party);

        this.io.to(party.code).emit('settings_updated', {
            settings: updatedSettings,
            updatedBy: player.name
        });

        console.log(`[${new Date().toISOString()}] Settings updated in party ${party.code}`);
    }

    async handleStartGame(socket) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player || !player.isHost) {
            throw new Error('Only host can start the game');
        }

        if (party.players.size < 2) {
            throw new Error('Need 2 players to start');
        }

        party.startGame(player.id);
        party.startSelectionPhase();
        await this.partyService.saveParty(party);
        
        // Initialize tracking
        this.finishedPlayers.set(party.code, new Set());
        this.roundLocks.set(party.code, false);

        this.startSelectionTimer(party);

        this.io.to(party.code).emit('game_started', {
            party: party.getDetailedState(),
            selectionTimeLimit: config.SELECTION_TIME_LIMIT
        });

        console.log(`[${new Date().toISOString()}] Game started in party ${party.code}`);
    }

    async handleSetReady(socket, data) {
        const { secretNumber } = data;
        
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player) throw new Error('Player not found');

        if (party.gameState.phase !== 'selection') {
            throw new Error('Not in selection phase');
        }

        party.setPlayerReady(player.id, secretNumber);
        await this.partyService.saveParty(party);

        this.io.to(party.code).emit('player_ready', {
            playerId: player.id,
            playerName: player.name,
            allReady: party.allPlayersReady()
        });

        if (party.allPlayersReady()) {
            this.clearSelectionTimer(party.code);
            await this.startPlayingPhase(party);
        }
    }

    async handleMakeGuess(socket, data) {
        const { guess } = data;
        
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player) throw new Error('Player not found');

        if (party.gameState.phase !== 'playing') {
            throw new Error('Game not in playing phase');
        }

        // Check if player already finished
        const finishedSet = this.finishedPlayers.get(party.code) || new Set();
        if (finishedSet.has(player.id)) {
            throw new Error('You already found the number! Wait for opponent.');
        }

        const opponent = Array.from(party.players.values()).find(p => p.id !== player.id);
        if (!opponent) throw new Error('Opponent not found');

        // Make the guess
        const guessResult = party.makeGuess(player.id, guess);
        await this.partyService.saveParty(party);

        const feedback = this.gameService.generateFeedback(
            guess,
            opponent.secretNumber,
            party.gameSettings.rangeStart,
            party.gameSettings.rangeEnd
        );

        // Send feedback to guesser
        socket.emit('guess_result', {
            guess,
            attempts: player.attempts,
            feedback,
            isCorrect: guessResult.isCorrect
        });

        // Notify opponent
        this.io.to(opponent.socketId).emit('opponent_guessed', {
            opponentName: player.name,
            attempts: player.attempts,
            isCorrect: guessResult.isCorrect
        });

        // Handle correct guess
        if (guessResult.isCorrect) {
            await this.handlePlayerFinished(party, player, opponent, finishedSet);
        } else {
            // Check if should end early (exceeded opponent's attempts)
            if (finishedSet.has(opponent.id) && player.attempts >= opponent.attempts) {
                await this.endRoundEarly(party, opponent.id, 'exceeded_attempts');
            }
        }
    }

    async handlePlayerFinished(party, player, opponent, finishedSet) {
        finishedSet.add(player.id);
        this.finishedPlayers.set(party.code, finishedSet);
        
        player.hasFinished = true;
        player.finishedAt = Date.now();
        await this.partyService.saveParty(party);

        // Broadcast that player finished
        this.io.to(party.code).emit('player_finished', {
            playerId: player.id,
            playerName: player.name,
            attempts: player.attempts,
            isFirstToFinish: finishedSet.size === 1,
            targetNumber: opponent.secretNumber
        });

        if (finishedSet.size >= 2) {
            // Both finished - determine winner
            await this.determineWinnerAndEndRound(party, finishedSet);
        } else {
            // First to finish
            const canOpponentWin = opponent.attempts < player.attempts;
            
            if (canOpponentWin) {
                this.io.to(opponent.socketId).emit('opponent_finished_first', {
                    opponentName: player.name,
                    opponentAttempts: player.attempts,
                    yourAttempts: opponent.attempts,
                    attemptsToWin: player.attempts - 1,
                    attemptsToTie: player.attempts
                });
                
                this.io.to(player.socketId).emit('waiting_for_opponent', {
                    message: `You found it in ${player.attempts} attempts! Waiting for opponent to finish...`,
                    opponentAttempts: opponent.attempts
                });
            } else {
                // Opponent can't win anymore
                await this.endRoundEarly(party, player.id, 'exceeded_attempts');
            }
        }
    }

    async determineWinnerAndEndRound(party, finishedSet) {
        // Use lock to prevent race condition
        if (this.roundLocks.get(party.code)) return;
        this.roundLocks.set(party.code, true);

        const players = Array.from(party.players.values());
        const finishedPlayers = players.filter(p => finishedSet.has(p.id));
        
        // Sort by attempts, then by finish time
        finishedPlayers.sort((a, b) => {
            if (a.attempts !== b.attempts) {
                return a.attempts - b.attempts;
            }
            return a.finishedAt - b.finishedAt;
        });
        
        const winner = finishedPlayers[0];
        const loser = finishedPlayers[1];
        
        let winReason = 'fewer_attempts';
        if (winner.attempts === loser.attempts) {
            winReason = 'same_attempts_faster';
        }
        
        await this.endRound(party, winner.id, {
            winReason,
            winnerAttempts: winner.attempts,
            loserAttempts: loser.attempts,
            bothFinished: true
        });
        
        this.roundLocks.set(party.code, false);
    }

    async endRoundEarly(party, winnerId, reason) {
        if (this.roundLocks.get(party.code)) return;
        this.roundLocks.set(party.code, true);

        const winner = party.getPlayer(winnerId);
        const players = Array.from(party.players.values());
        const loser = players.find(p => p.id !== winnerId);
        
        await this.endRound(party, winnerId, {
            winReason: reason,
            winnerAttempts: winner.attempts,
            loserAttempts: loser.attempts,
            bothFinished: false,
            earlyEnd: true
        });
        
        this.roundLocks.set(party.code, false);
    }

    async endRound(party, winnerId, additionalData = {}) {
        const result = party.endRound(winnerId);
        await this.partyService.saveParty(party);

        const { roundResult, isGameComplete, gameWinner } = result;

        this.finishedPlayers.delete(party.code);

        if (isGameComplete) {
            this.partyService.recordGameCompletion();
        }

        const roundSummary = this.gameService.generateRoundSummary(
            roundResult,
            party.gameSettings
        );

        this.io.to(party.code).emit('round_ended', {
            roundResult: roundSummary,
            isGameComplete,
            gameWinner: gameWinner ? gameWinner.getPublicInfo() : null,
            party: party.getDetailedState(),
            additionalData
        });

        console.log(`[${new Date().toISOString()}] Round ended in party ${party.code}, winner: ${winnerId}`);
    }

    async handleNextRound(socket) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player || !player.isHost) {
            throw new Error('Only host can start next round');
        }

        party.nextRound();
        party.startSelectionPhase();
        await this.partyService.saveParty(party);

        this.finishedPlayers.set(party.code, new Set());
        this.roundLocks.set(party.code, false);

        this.startSelectionTimer(party);

        this.io.to(party.code).emit('next_round_started', {
            party: party.getDetailedState(),
            selectionTimeLimit: config.SELECTION_TIME_LIMIT
        });
    }

    async handleRematch(socket) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player) throw new Error('Player not found');

        player.wantsRematch = true;
        await this.partyService.saveParty(party);
        
        const allWantRematch = Array.from(party.players.values())
            .every(p => p.wantsRematch);
        
        if (allWantRematch) {
            party.rematch();
            party.players.forEach(p => p.wantsRematch = false);
            await this.partyService.saveParty(party);

            this.finishedPlayers.delete(party.code);
            this.roundLocks.set(party.code, false);

            this.startSelectionTimer(party);

            this.io.to(party.code).emit('rematch_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });
        } else {
            this.io.to(party.code).emit('rematch_requested', {
                requestedBy: player.name,
                playerId: player.id
            });
        }
    }

    async handleSettingsChangeRequest(socket) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) throw new Error('Party not found');

        party.gameState.phase = 'lobby';
        party.status = 'waiting';
        
        party.players.forEach(p => {
            p.resetForNewRound();
            p.wantsRematch = false;
        });
        await this.partyService.saveParty(party);

        this.finishedPlayers.delete(party.code);
        this.clearSelectionTimer(party.code);
        this.roundLocks.set(party.code, false);

        this.io.to(party.code).emit('settings_change_started', {
            party: party.getDetailedState()
        });
    }

    async handlePlayerTyping(socket, data) {
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) return;

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player) return;

        socket.to(party.code).emit('player_typing', {
            playerId: player.id,
            playerName: player.name,
            isTyping: data.isTyping
        });
    }

    async handleHeartbeat(socket) {
        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (player) {
            player.updateActivity();
            // We could save here, but heartbeat is frequent. 
            // Better to rely on other actions or a background sync for pure activity updates 
            // unless we use Redis which is fast enough.
        }
        socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }

    async handleReconnectAttempt(socket, data) {
        const { partyCode, playerId } = data;
        
        // Clear any pending reconnect timeout
        const timeoutKey = `${partyCode}_${playerId}`;
        if (this.reconnectTimeouts.has(timeoutKey)) {
            clearTimeout(this.reconnectTimeouts.get(timeoutKey));
            this.reconnectTimeouts.delete(timeoutKey);
        }
        
        const result = await this.partyService.reconnectPlayer(
            socket.id,
            partyCode,
            playerId
        );
        
        if (result.success) {
            socket.join(partyCode);
            
            socket.emit('reconnected', {
                party: result.party.getDetailedState(),
                player: result.player.getPrivateInfo()
            });

            socket.to(partyCode).emit('player_reconnected', {
                playerId,
                playerName: result.player.name
            });

            console.log(`[${new Date().toISOString()}] Player ${result.player.name} reconnected to party ${partyCode}`);
        } else {
            socket.emit('reconnect_failed', { error: result.error });
        }
    }

    handleSocketError(socket, error) {
        console.error(`[${new Date().toISOString()}] Socket error for ${socket.id}:`, error);
        this.sendError(socket, 'Socket error occurred', 'socket_error');
    }

    async handleDisconnection(socket, reason) {
        console.log(`[${new Date().toISOString()}] Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        const party = await this.partyService.getPartyBySocket(socket.id);
        if (!party) return;

        const player = await this.partyService.getPlayerBySocket(socket.id);
        if (!player) return;

        // Set grace period for reconnection (30 seconds)
        const timeoutKey = `${party.code}_${player.id}`;
        const reconnectTimeout = setTimeout(() => {
            this.handleLeaveParty(socket, true);
        }, 30000);
        
        this.reconnectTimeouts.set(timeoutKey, reconnectTimeout);

        // Mark player as disconnected but don't remove yet
        player.setConnected(false);
        await this.partyService.saveParty(party);
        
        socket.to(party.code).emit('player_disconnected', {
            playerId: player.id,
            playerName: player.name,
            gracePeriod: 30000
        });
    }

    // Timer management
    startSelectionTimer(party) {
        this.clearSelectionTimer(party.code);

        let timeLeft = config.SELECTION_TIME_LIMIT;
        party.gameState.roundStartTime = Date.now();
        
        const timer = setInterval(async () => {
            timeLeft--;
            
            this.io.to(party.code).emit('selection_timer', { timeLeft });
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.selectionTimers.delete(party.code);
                
                // Need to fetch fresh state in case it changed
                const currentParty = await this.partyService.getParty(party.code);
                if (currentParty) {
                    currentParty.autoSelectNumbers();
                    await this.partyService.saveParty(currentParty);
                    await this.startPlayingPhase(currentParty);
                }
            }
        }, 1000);

        this.selectionTimers.set(party.code, timer);
    }

    clearSelectionTimer(partyCode) {
        const timer = this.selectionTimers.get(partyCode);
        if (timer) {
            clearInterval(timer);
            this.selectionTimers.delete(partyCode);
        }
    }

    async startPlayingPhase(party) {
        party.startPlayingPhase();
        party.gameState.roundStartTime = Date.now();
        await this.partyService.saveParty(party);

        this.io.to(party.code).emit('playing_started', {
            party: party.getDetailedState()
        });

        console.log(`[${new Date().toISOString()}] Playing phase started in party ${party.code}`);
    }

    // Utility methods
    sendError(socket, message, context = 'general') {
        socket.emit('error', {
            message,
            context,
            timestamp: Date.now()
        });
    }

    performCleanup() {
        // Clear old rate limits (older than 5 minutes)
        const now = Date.now();
        for (const [key, timestamp] of this.rateLimits.entries()) {
            if (now - timestamp > 300000) {
                this.rateLimits.delete(key);
            }
        }

        console.log(`[${new Date().toISOString()}] Cleanup performed - Rate limits: ${this.rateLimits.size}`);
    }

    cleanup() {
        // Clear all timers and state
        this.selectionTimers.forEach(timer => clearInterval(timer));
        this.selectionTimers.clear();
        
        this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout));
        this.reconnectTimeouts.clear();
        
        this.finishedPlayers.clear();
        this.roundLocks.clear();
        this.rateLimits.clear();
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        console.log(`[${new Date().toISOString()}] SocketService cleanup completed`);
    }
}

module.exports = SocketService;