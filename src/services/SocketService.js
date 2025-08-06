const GameService = require('./GameService');
const config = require('../../config/config');

class SocketService {
    constructor(io, partyService) {
        this.io = io;
        this.partyService = partyService;
        this.gameService = new GameService(partyService);
        this.selectionTimers = new Map(); // partyCode -> timer
    }

    // Handle new socket connection
    handleConnection(socket) {
        console.log(`Socket connected: ${socket.id}`);

        // Register all event handlers
        this.registerEventHandlers(socket);

        // Send connection acknowledgment
        socket.emit('connected', {
            socketId: socket.id,
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
        });
    }

    // Register all socket event handlers
    registerEventHandlers(socket) {
        // Party management events
        socket.on('create_party', (data) => this.handleCreateParty(socket, data));
        socket.on('join_party', (data) => this.handleJoinParty(socket, data));
        socket.on('leave_party', () => this.handleLeaveParty(socket));
        socket.on('update_settings', (data) => this.handleUpdateSettings(socket, data));

        // Game flow events
        socket.on('start_game', () => this.handleStartGame(socket));
        socket.on('set_ready', (data) => this.handleSetReady(socket, data));
        socket.on('make_guess', (data) => this.handleMakeGuess(socket, data));
        socket.on('next_round', () => this.handleNextRound(socket));
        socket.on('rematch', () => this.handleRematch(socket));

        // Communication events
        socket.on('player_typing', (data) => this.handlePlayerTyping(socket, data));
        socket.on('heartbeat', () => this.handleHeartbeat(socket));

        // Reconnection events
        socket.on('reconnect_attempt', (data) => this.handleReconnectAttempt(socket, data));

        // Error handling
        socket.on('error', (error) => this.handleSocketError(socket, error));
    }

    // Handle create party
    handleCreateParty(socket, data) {
        try {
            const { playerName } = data;

            // Validate player name
            const nameValidation = this.partyService.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                socket.emit('error', { message: nameValidation.error });
                return;
            }

            // Check if player is already in a party
            if (this.partyService.isSocketInParty(socket.id)) {
                socket.emit('error', { message: 'You are already in a party' });
                return;
            }

            // Create party
            const party = this.partyService.createParty(socket.id, nameValidation.name);
            
            // Join socket room
            socket.join(party.code);

            // Send success response
            socket.emit('party_created', {
                party: party.getPublicInfo(),
                player: party.getPlayer(party.hostId).getPrivateInfo()
            });

            console.log(`Party created: ${party.code} by ${nameValidation.name}`);

        } catch (error) {
            console.error('Error creating party:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle join party
    handleJoinParty(socket, data) {
        try {
            const { partyCode, playerName } = data;

            // Validate inputs
            const codeValidation = this.partyService.validatePartyCode(partyCode);
            if (!codeValidation.valid) {
                socket.emit('error', { message: codeValidation.error });
                return;
            }

            const nameValidation = this.partyService.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                socket.emit('error', { message: nameValidation.error });
                return;
            }

            // Join party
            const result = this.partyService.joinParty(
                partyCode.toUpperCase(), 
                socket.id, 
                nameValidation.name
            );

            // Join socket room
            socket.join(result.party.code);

            // Notify all players in party
            this.io.to(result.party.code).emit('player_joined', {
                party: result.party.getPublicInfo(),
                newPlayer: result.player.getPublicInfo()
            });

            // Send success response to joining player
            socket.emit('party_joined', {
                party: result.party.getPublicInfo(),
                player: result.player.getPrivateInfo()
            });

            console.log(`Player joined: ${nameValidation.name} -> Party ${partyCode}`);

        } catch (error) {
            console.error('Error joining party:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle leave party
    handleLeaveParty(socket) {
        try {
            const result = this.partyService.leaveParty(socket.id);
            if (!result) return;

            const { party, player, partyCode } = result;

            // Leave socket room
            socket.leave(partyCode);

            // Notify remaining players
            if (!party.isEmpty()) {
                this.io.to(partyCode).emit('player_left', {
                    party: party.getPublicInfo(),
                    leftPlayer: player.getPublicInfo()
                });
            }

            // Clear any selection timer for this party
            this.clearSelectionTimer(partyCode);

            // Confirm to leaving player
            socket.emit('party_left', { partyCode });

            console.log(`Player left: ${player?.name || 'Unknown'} from Party ${partyCode}`);

        } catch (error) {
            console.error('Error leaving party:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle update settings
    handleUpdateSettings(socket, data) {
        try {
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = this.partyService.getPlayerBySocket(socket.id);
            if (!player || !player.isHost) {
                socket.emit('error', { message: 'Only host can update settings' });
                return;
            }

            const updatedSettings = party.updateSettings(data, player.id);

            // Notify all players
            this.io.to(party.code).emit('settings_updated', {
                settings: updatedSettings,
                updatedBy: player.name
            });

        } catch (error) {
            console.error('Error updating settings:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle start game
    handleStartGame(socket) {
        try {
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = this.partyService.getPlayerBySocket(socket.id);
            if (!player || !player.isHost) {
                socket.emit('error', { message: 'Only host can start the game' });
                return;
            }

            party.startGame(player.id);
            party.startSelectionPhase();

            // Start selection timer
            this.startSelectionTimer(party);

            // Notify all players
            this.io.to(party.code).emit('game_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle set ready
    handleSetReady(socket, data) {
        try {
            const { secretNumber } = data;
            
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = this.partyService.getPlayerBySocket(socket.id);
            if (!player) {
                socket.emit('error', { message: 'Player not found' });
                return;
            }

            party.setPlayerReady(player.id, secretNumber);

            // Notify all players about ready status
            this.io.to(party.code).emit('player_ready', {
                playerId: player.id,
                playerName: player.name,
                allReady: party.allPlayersReady()
            });

            // If all players ready, start playing phase
            if (party.allPlayersReady()) {
                this.clearSelectionTimer(party.code);
                this.startPlayingPhase(party);
            }

        } catch (error) {
            console.error('Error setting ready:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle make guess
    handleMakeGuess(socket, data) {
        try {
            const { guess } = data;
            
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = this.partyService.getPlayerBySocket(socket.id);
            if (!player) {
                socket.emit('error', { message: 'Player not found' });
                return;
            }

            // Make the guess
            const guessResult = party.makeGuess(player.id, guess);
            
            // Generate feedback message
            const opponent = Array.from(party.players.values()).find(p => p.id !== player.id);
            const feedback = this.gameService.generateFeedback(
                guess, 
                opponent.secretNumber, 
                party.gameSettings.rangeStart, 
                party.gameSettings.rangeEnd
            );

            // Send feedback to guesser
            socket.emit('guess_result', {
                guess: guess,
                attempts: player.attempts,
                feedback: feedback,
                isCorrect: guessResult.isCorrect
            });

            // Notify opponent about the guess
            this.io.to(opponent.socketId).emit('opponent_guessed', {
                opponentName: player.name,
                attempts: player.attempts,
                isCorrect: guessResult.isCorrect
            });

            // If correct, end the round IMMEDIATELY
            if (guessResult.isCorrect) {
                // End round right away - don't wait for opponent
                this.endRound(party, player.id);
            }

        } catch (error) {
            console.error('Error making guess:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle next round
    handleNextRound(socket) {
        try {
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = this.partyService.getPlayerBySocket(socket.id);
            if (!player || !player.isHost) {
                socket.emit('error', { message: 'Only host can start next round' });
                return;
            }

            party.nextRound();
            party.startSelectionPhase();

            // Start selection timer
            this.startSelectionTimer(party);

            // Notify all players
            this.io.to(party.code).emit('next_round_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            console.error('Error starting next round:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle rematch
    handleRematch(socket) {
        try {
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            party.rematch();

            // Start selection timer
            this.startSelectionTimer(party);

            // Notify all players
            this.io.to(party.code).emit('rematch_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            console.error('Error starting rematch:', error);
            socket.emit('error', { message: error.message });
        }
    }

    // Handle player typing (for UI feedback)
    handlePlayerTyping(socket, data) {
        const party = this.partyService.getPartyBySocket(socket.id);
        if (!party) return;

        const player = this.partyService.getPlayerBySocket(socket.id);
        if (!player) return;

        // Broadcast typing status to other players
        socket.to(party.code).emit('player_typing', {
            playerId: player.id,
            playerName: player.name,
            isTyping: data.isTyping
        });
    }

    // Handle heartbeat
    handleHeartbeat(socket) {
        const player = this.partyService.getPlayerBySocket(socket.id);
        if (player) {
            player.updateActivity();
        }
        socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }

    // Handle reconnection attempt
    handleReconnectAttempt(socket, data) {
        try {
            const { partyCode, playerId } = data;
            
            const result = this.partyService.reconnectPlayer(socket.id, partyCode, playerId);
            
            if (result.success) {
                socket.join(partyCode);
                socket.emit('reconnected', {
                    party: result.party.getDetailedState(),
                    player: result.player.getPrivateInfo()
                });

                // Notify other players
                socket.to(partyCode).emit('player_reconnected', {
                    playerId: playerId,
                    playerName: result.player.name
                });
            } else {
                socket.emit('reconnect_failed', { error: result.error });
            }

        } catch (error) {
            console.error('Error handling reconnection:', error);
            socket.emit('reconnect_failed', { error: error.message });
        }
    }

    // Handle socket error
    handleSocketError(socket, error) {
        console.error(`Socket error for ${socket.id}:`, error);
        socket.emit('error', { message: 'Socket error occurred' });
    }

    // Handle disconnection
    handleDisconnection(socket, reason) {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        
        const result = this.partyService.cleanupDisconnectedPlayer(socket.id);
        if (result) {
            const { party, player, partyCode } = result;
            
            // Notify other players about disconnection
            this.io.to(partyCode).emit('player_disconnected', {
                playerId: player.id,
                playerName: player.name,
                reason: reason
            });

            // Clear selection timer if party becomes inactive
            if (party.isEmpty()) {
                this.clearSelectionTimer(partyCode);
            }
        }
    }

    // Start selection timer for a party
    startSelectionTimer(party) {
        // Clear existing timer
        this.clearSelectionTimer(party.code);

        let timeLeft = config.SELECTION_TIME_LIMIT;
        
        const timer = setInterval(() => {
            timeLeft--;
            
            // Broadcast timer update
            this.io.to(party.code).emit('selection_timer', { timeLeft });
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.selectionTimers.delete(party.code);
                
                // Auto-select numbers for players who haven't chosen
                party.autoSelectNumbers();
                
                // Start playing phase
                this.startPlayingPhase(party);
            }
        }, 1000);

        this.selectionTimers.set(party.code, timer);
    }

    // Clear selection timer
    clearSelectionTimer(partyCode) {
        const timer = this.selectionTimers.get(partyCode);
        if (timer) {
            clearInterval(timer);
            this.selectionTimers.delete(partyCode);
        }
    }

    // Start playing phase
    startPlayingPhase(party) {
        try {
            party.startPlayingPhase();

            // Notify all players
            this.io.to(party.code).emit('playing_started', {
                party: party.getDetailedState()
            });

        } catch (error) {
            console.error('Error starting playing phase:', error);
            this.io.to(party.code).emit('error', { message: error.message });
        }
    }

    // End round
    endRound(party, winnerId) {
        try {
            const result = party.endRound(winnerId);
            const { roundResult, isGameComplete, gameWinner } = result;

            // Record game completion if game is complete
            if (isGameComplete) {
                this.partyService.recordGameCompletion();
            }

            // Generate round summary
            const roundSummary = this.gameService.generateRoundSummary(roundResult, party.gameSettings);

            // Notify all players
            this.io.to(party.code).emit('round_ended', {
                roundResult: roundSummary,
                isGameComplete,
                gameWinner: gameWinner ? gameWinner.getPublicInfo() : null,
                party: party.getDetailedState()
            });

        } catch (error) {
            console.error('Error ending round:', error);
            this.io.to(party.code).emit('error', { message: error.message });
        }
    }

    // Clean up all timers
    cleanup() {
        this.selectionTimers.forEach(timer => clearInterval(timer));
        this.selectionTimers.clear();
    }
}

module.exports = SocketService;