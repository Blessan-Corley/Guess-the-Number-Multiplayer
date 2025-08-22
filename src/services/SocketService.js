const GameService = require('./GameService');
const config = require('../../config/config');

class SocketService {
    constructor(io, partyService) {
        this.io = io;
        this.partyService = partyService;
        this.gameService = new GameService(partyService);
        this.selectionTimers = new Map(); // partyCode -> timer
        this.finishedPlayers = new Map(); // partyCode -> Set of finished player IDs
    }

    // Handle new socket connection
    handleConnection(socket) {

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
        
        // FIXED: Handle settings change requests  
        socket.on('request_settings_change', () => this.handleSettingsChangeRequest(socket));

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


        } catch (error) {
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
                socket.emit('error', { message: codeValidation.error, type: 'validation' });
                return;
            }

            const nameValidation = this.partyService.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                socket.emit('error', { message: nameValidation.error, type: 'validation' });
                return;
            }

            // Check if party exists and is full before attempting to join
            const party = this.partyService.getParty(partyCode.toUpperCase());
            if (!party) {
                socket.emit('error', { message: 'Party not found. Please check the code and try again.', type: 'not_found' });
                return;
            }

            if (party.isFull()) {
                socket.emit('error', { message: 'This session is full. Only 2 players can join a party.', type: 'party_full' });
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


        } catch (error) {
            let errorType = 'general';
            let errorMessage = error.message;

            // Provide specific error types for different scenarios
            if (error.message.includes('full')) {
                errorType = 'party_full';
                errorMessage = 'This session is full. Only 2 players can join a party.';
            } else if (error.message.includes('not found')) {
                errorType = 'not_found';
                errorMessage = 'Party not found. Please check the code and try again.';
            } else if (error.message.includes('already in')) {
                errorType = 'already_in_party';
                errorMessage = 'You are already in a party. Please leave your current party first.';
            }

            socket.emit('error', { message: errorMessage, type: errorType });
        }
    }

    // Handle leave party
    handleLeaveParty(socket) {
        try {
            const result = this.partyService.leaveParty(socket.id);
            if (!result) return;

            const { party, player, partyCode, wasHost } = result;

            // Leave socket room
            socket.leave(partyCode);

            // Clean up finished players tracking
            if (this.finishedPlayers.has(partyCode)) {
                this.finishedPlayers.get(partyCode).delete(player.id);
                if (this.finishedPlayers.get(partyCode).size === 0) {
                    this.finishedPlayers.delete(partyCode);
                }
            }

            // FIXED: If host leaves, close entire party
            if (wasHost || player.isHost) {
                // Notify all remaining players that party is closed
                this.io.to(partyCode).emit('party_closed_host_left', {
                    hostName: player.name,
                    message: `🚔 ${player.name} (host) left the party. Party has been closed.`
                });
                
                // Clear any timers
                this.clearSelectionTimer(partyCode);
                
            } else if (!party.isEmpty()) {
                // Regular player left
                this.io.to(partyCode).emit('player_left', {
                    party: party.getPublicInfo(),
                    leftPlayer: player.getPublicInfo(),
                    message: `${player.name} left the party`
                });
            }

            // Confirm to leaving player
            socket.emit('party_left', { partyCode });


        } catch (error) {
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

            // Initialize finished players tracking
            this.finishedPlayers.set(party.code, new Set());

            // Start selection timer
            this.startSelectionTimer(party);

            // Notify all players
            this.io.to(party.code).emit('game_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
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
            socket.emit('error', { message: error.message });
        }
    }

    // Handle make guess - FIXED: Don't end game immediately
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

            // Check if player already finished
            const finishedSet = this.finishedPlayers.get(party.code) || new Set();
            if (finishedSet.has(player.id)) {
                socket.emit('error', { message: 'You have already found the number! Wait for your opponent.' });
                return;
            }

            // Make the guess - This already contains the feedback logic internally
            const guessResult = party.makeGuess(player.id, guess);
            
            // Find opponent for notifications
            const opponent = Array.from(party.players.values()).find(p => p.id !== player.id);
            if (!opponent) {
                socket.emit('error', { message: 'Opponent not found' });
                return;
            }
            
            // Generate feedback message using the correct target number (opponent's secret)
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

            // If correct, mark player as finished
            if (guessResult.isCorrect) {
                finishedSet.add(player.id);
                this.finishedPlayers.set(party.code, finishedSet);
                
                // Mark player as finished
                player.hasFinished = true;
                player.finishedAt = Date.now();
                
                // Get opponent for comparison
                const players = Array.from(party.players.values());
                const opponentPlayer = players.find(p => p.id !== player.id);
                
                // Enhanced notification with more context
                this.io.to(party.code).emit('player_finished', {
                    playerId: player.id,
                    playerName: player.name,
                    attempts: player.attempts,
                    isFirstToFinish: finishedSet.size === 1,
                    targetNumber: opponent.secretNumber, // Include what number they found
                    timeToFinish: Date.now() - party.gameState.roundStartTime || 0
                });

                // Check game ending conditions
                if (finishedSet.size >= 2) {
                    // Both players finished - determine winner by attempts and timing
                    this.determineWinnerAndEndRound(party, finishedSet);
                } else if (finishedSet.size === 1) {
                    // First player finished - check if opponent can still win
                    const canOpponentWin = opponentPlayer.attempts < player.attempts;
                    
                    if (canOpponentWin) {
                        // Opponent can still win, continue game
                        this.io.to(opponentPlayer.socketId).emit('opponent_finished_first', {
                            opponentName: player.name,
                            opponentAttempts: player.attempts,
                            yourAttempts: opponentPlayer.attempts,
                            attemptsToWin: player.attempts - 1,
                            message: `${player.name} found the number in ${player.attempts} attempts! You need to find it in ${player.attempts - 1} or fewer attempts to win!`
                        });
                        
                        this.io.to(player.socketId).emit('waiting_for_opponent', {
                            message: `🎯 Great! You found it in ${player.attempts} attempts! Waiting for ${opponentPlayer.name} to finish...`,
                            opponentAttempts: opponentPlayer.attempts
                        });
                    } else {
                        // Opponent already exceeded attempts, game over
                        this.endRoundEarly(party, player.id, 'exceeded_attempts');
                    }
                }
            } else {
                // Wrong guess - check if opponent finished and this player exceeded attempts
                const opponentFinished = Array.from(party.players.values()).find(p => 
                    p.id !== player.id && finishedSet.has(p.id)
                );
                
                if (opponentFinished && player.attempts >= opponentFinished.attempts) {
                    // This player has exceeded the winner's attempts, end game
                    this.endRoundEarly(party, opponentFinished.id, 'exceeded_attempts');
                    return;
                }
            }

        } catch (error) {
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

            // Reset finished players tracking
            this.finishedPlayers.set(party.code, new Set());

            // Start selection timer
            this.startSelectionTimer(party);

            // Notify all players
            this.io.to(party.code).emit('next_round_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    // Handle rematch request
    handleRematch(socket) {
        try {
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

            // Mark player as wanting rematch
            player.wantsRematch = true;
            
            // Check if all players want rematch
            const allWantRematch = Array.from(party.players.values()).every(p => p.wantsRematch);
            
            if (allWantRematch) {
                // All players agreed, start rematch
                party.rematch();
                
                // Reset rematch flags
                party.players.forEach(p => p.wantsRematch = false);

                // Reset finished players tracking
                this.finishedPlayers.delete(party.code); // Clear completely

                // FIXED: Start selection immediately for direct rematch
                this.startSelectionTimer(party);

                // Notify all players - ALWAYS direct to selection for rematch
                this.io.to(party.code).emit('rematch_started', {
                    party: party.getDetailedState(),
                    selectionTimeLimit: config.SELECTION_TIME_LIMIT
                    // No flag needed - rematch ALWAYS goes to selection
                });
            } else {
                // Notify about rematch request
                this.io.to(party.code).emit('rematch_requested', {
                    requestedBy: player.name,
                    playerId: player.id,
                    allPlayersReady: allWantRematch
                });
            }

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }
    
    // FIXED: Handle settings change request - return to lobby
    handleSettingsChangeRequest(socket) {
        try {
            const party = this.partyService.getPartyBySocket(socket.id);
            if (!party) {
                socket.emit('error', { message: 'Party not found' });
                return;
            }

            const player = party.getPlayerBySocketId(socket.id);
            if (!player) {
                socket.emit('error', { message: 'Player not found' });
                return;
            }

            // Reset party to lobby state
            party.gameState.phase = 'lobby';
            party.status = 'waiting';
            
            // Reset players for new game
            party.players.forEach(p => {
                p.resetForNewRound();
                p.wantsRematch = false;
            });

            // Clear finished players tracking
            this.finishedPlayers.delete(party.code);

            // Clear any selection timer
            this.clearSelectionTimer(party.code);

            // Notify all players to go to lobby
            this.io.to(party.code).emit('settings_change_started', {
                party: party.getDetailedState(),
                message: `${player.name} requested settings change`
            });


        } catch (error) {
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
            socket.emit('reconnect_failed', { error: error.message });
        }
    }

    // Handle socket error
    handleSocketError(socket, error) {
        socket.emit('error', { message: 'Socket error occurred' });
    }

    // Handle disconnection
    handleDisconnection(socket, reason) {
        
        const result = this.partyService.leaveParty(socket.id);
        if (result) {
            const { party, player, partyCode } = result;
            
            // Clean up finished players tracking
            if (this.finishedPlayers.has(partyCode)) {
                this.finishedPlayers.get(partyCode).delete(player.id);
                if (this.finishedPlayers.get(partyCode).size === 0) {
                    this.finishedPlayers.delete(partyCode);
                }
            }

            // If game is in progress and player leaves, end game immediately
            if (party && !party.isEmpty() && party.gameState.phase === 'playing') {
                const remainingPlayer = Array.from(party.players.values())[0];
                
                // Notify remaining player they won by default
                this.io.to(partyCode).emit('game_ended_by_leave', {
                    winner: remainingPlayer.getPublicInfo(),
                    leftPlayer: player.getPublicInfo(),
                    message: `${player.name} disconnected. ${remainingPlayer.name} wins by default!`
                });
            } else if (!party.isEmpty()) {
                // Notify remaining players
                this.io.to(partyCode).emit('player_left', {
                    party: party.getPublicInfo(),
                    leftPlayer: player.getPublicInfo()
                });
            }

            // Clear selection timer if party becomes inactive
            if (party.isEmpty()) {
                this.clearSelectionTimer(partyCode);
                this.finishedPlayers.delete(partyCode);
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
            this.io.to(party.code).emit('error', { message: error.message });
        }
    }

    // Determine winner when both players finished and end round
    determineWinnerAndEndRound(party, finishedSet) {
        const players = Array.from(party.players.values());
        const finishedPlayers = players.filter(p => finishedSet.has(p.id));
        
        // Sort by attempts (lower is better), then by finish time (earlier wins)
        finishedPlayers.sort((a, b) => {
            if (a.attempts !== b.attempts) {
                return a.attempts - b.attempts;
            }
            return a.finishedAt - b.finishedAt; // Earlier finish time wins if same attempts
        });
        
        const winner = finishedPlayers[0];
        const loser = finishedPlayers[1];
        
        // Determine win reason
        let winReason = '';
        if (winner.attempts < loser.attempts) {
            winReason = 'fewer_attempts';
        } else if (winner.attempts === loser.attempts) {
            winReason = 'same_attempts_faster';
        }
        
        this.endRound(party, winner.id, { 
            winReason, 
            winnerAttempts: winner.attempts, 
            loserAttempts: loser.attempts,
            bothFinished: true
        });
    }

    // End round early due to one player exceeding attempts
    endRoundEarly(party, winnerId, reason) {
        const winner = party.getPlayer(winnerId);
        const players = Array.from(party.players.values());
        const loser = players.find(p => p.id !== winnerId);
        
        this.endRound(party, winnerId, {
            winReason: reason,
            winnerAttempts: winner.attempts,
            loserAttempts: loser.attempts,
            bothFinished: false,
            earlyEnd: true
        });
    }

    // End round
    endRound(party, winnerId, additionalData = {}) {
        try {
            const result = party.endRound(winnerId);
            const { roundResult, isGameComplete, gameWinner } = result;

            // Clean up finished players tracking for this round
            this.finishedPlayers.delete(party.code);

            // Record game completion if game is complete
            if (isGameComplete) {
                this.partyService.recordGameCompletion();
            }

            // Generate round summary with additional context
            const roundSummary = this.gameService.generateRoundSummary(roundResult, party.gameSettings);
            roundSummary.additionalData = additionalData;

            // Notify all players
            this.io.to(party.code).emit('round_ended', {
                roundResult: roundSummary,
                isGameComplete,
                gameWinner: gameWinner ? gameWinner.getPublicInfo() : null,
                party: party.getDetailedState(),
                additionalData
            });

        } catch (error) {
            this.io.to(party.code).emit('error', { message: error.message });
        }
    }

    // Clean up all timers
    cleanup() {
        this.selectionTimers.forEach(timer => clearInterval(timer));
        this.selectionTimers.clear();
        this.finishedPlayers.clear();
    }
}

module.exports = SocketService;