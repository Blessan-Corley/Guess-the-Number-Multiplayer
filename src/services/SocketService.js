const GameService = require('./GameService');
const config = require('../../config/config');

class SocketService {
    constructor(io, partyService) {
        this.io = io;
        this.partyService = partyService;
        this.gameService = new GameService(partyService);
        this.selectionTimers = new Map(); 
        this.finishedPlayers = new Map(); 
    }

    
    handleConnection(socket) {

        
        this.registerEventHandlers(socket);

        
        socket.emit('connected', {
            socketId: socket.id,
            timestamp: Date.now(),
            serverTime: new Date().toISOString()
        });
    }

    
    registerEventHandlers(socket) {
        
        socket.on('create_party', (data) => this.handleCreateParty(socket, data));
        socket.on('join_party', (data) => this.handleJoinParty(socket, data));
        socket.on('leave_party', () => this.handleLeaveParty(socket));
        socket.on('update_settings', (data) => this.handleUpdateSettings(socket, data));

        
        socket.on('start_game', () => this.handleStartGame(socket));
        socket.on('set_ready', (data) => this.handleSetReady(socket, data));
        socket.on('make_guess', (data) => this.handleMakeGuess(socket, data));
        socket.on('next_round', () => this.handleNextRound(socket));
        socket.on('rematch', () => this.handleRematch(socket));
        
        
        socket.on('request_settings_change', () => this.handleSettingsChangeRequest(socket));

        
        socket.on('player_typing', (data) => this.handlePlayerTyping(socket, data));
        socket.on('heartbeat', () => this.handleHeartbeat(socket));

        
        socket.on('reconnect_attempt', (data) => this.handleReconnectAttempt(socket, data));

        
        socket.on('error', (error) => this.handleSocketError(socket, error));
    }

    
    handleCreateParty(socket, data) {
        try {
            const { playerName } = data;

            
            const nameValidation = this.partyService.validatePlayerName(playerName);
            if (!nameValidation.valid) {
                socket.emit('error', { message: nameValidation.error });
                return;
            }

            
            if (this.partyService.isSocketInParty(socket.id)) {
                socket.emit('error', { message: 'You are already in a party' });
                return;
            }

            
            const party = this.partyService.createParty(socket.id, nameValidation.name);
            
            
            socket.join(party.code);

            
            socket.emit('party_created', {
                party: party.getPublicInfo(),
                player: party.getPlayer(party.hostId).getPrivateInfo()
            });


        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
    handleJoinParty(socket, data) {
        try {
            const { partyCode, playerName } = data;

            
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

            
            const party = this.partyService.getParty(partyCode.toUpperCase());
            if (!party) {
                socket.emit('error', { message: 'Party not found. Please check the code and try again.', type: 'not_found' });
                return;
            }

            if (party.isFull()) {
                socket.emit('error', { message: 'This session is full. Only 2 players can join a party.', type: 'party_full' });
                return;
            }

            
            const result = this.partyService.joinParty(
                partyCode.toUpperCase(), 
                socket.id, 
                nameValidation.name
            );

            
            socket.join(result.party.code);

            
            this.io.to(result.party.code).emit('player_joined', {
                party: result.party.getPublicInfo(),
                newPlayer: result.player.getPublicInfo()
            });

            
            socket.emit('party_joined', {
                party: result.party.getPublicInfo(),
                player: result.player.getPrivateInfo()
            });


        } catch (error) {
            let errorType = 'general';
            let errorMessage = error.message;

            
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

    
    handleLeaveParty(socket) {
        try {
            const result = this.partyService.leaveParty(socket.id);
            if (!result) return;

            const { party, player, partyCode, wasHost } = result;

            
            socket.leave(partyCode);

            
            if (this.finishedPlayers.has(partyCode)) {
                this.finishedPlayers.get(partyCode).delete(player.id);
                if (this.finishedPlayers.get(partyCode).size === 0) {
                    this.finishedPlayers.delete(partyCode);
                }
            }

            
            if (wasHost || player.isHost) {
                
                this.io.to(partyCode).emit('party_closed_host_left', {
                    hostName: player.name,
                    message: `🚔 ${player.name} (host) left the party. Party has been closed.`
                });
                
                
                this.clearSelectionTimer(partyCode);
                
            } else if (!party.isEmpty()) {
                
                this.io.to(partyCode).emit('player_left', {
                    party: party.getPublicInfo(),
                    leftPlayer: player.getPublicInfo(),
                    message: `${player.name} left the party`
                });
            }

            
            socket.emit('party_left', { partyCode });


        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            this.io.to(party.code).emit('settings_updated', {
                settings: updatedSettings,
                updatedBy: player.name
            });

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            this.finishedPlayers.set(party.code, new Set());

            
            this.startSelectionTimer(party);

            
            this.io.to(party.code).emit('game_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            this.io.to(party.code).emit('player_ready', {
                playerId: player.id,
                playerName: player.name,
                allReady: party.allPlayersReady()
            });

            
            if (party.allPlayersReady()) {
                this.clearSelectionTimer(party.code);
                this.startPlayingPhase(party);
            }

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            const finishedSet = this.finishedPlayers.get(party.code) || new Set();
            if (finishedSet.has(player.id)) {
                socket.emit('error', { message: 'You have already found the number! Wait for your opponent.' });
                return;
            }

            
            const guessResult = party.makeGuess(player.id, guess);
            
            
            const opponent = Array.from(party.players.values()).find(p => p.id !== player.id);
            if (!opponent) {
                socket.emit('error', { message: 'Opponent not found' });
                return;
            }
            
            
            const feedback = this.gameService.generateFeedback(
                guess, 
                opponent.secretNumber, 
                party.gameSettings.rangeStart, 
                party.gameSettings.rangeEnd
            );
            

            
            socket.emit('guess_result', {
                guess: guess,
                attempts: player.attempts,
                feedback: feedback,
                isCorrect: guessResult.isCorrect
            });

            
            this.io.to(opponent.socketId).emit('opponent_guessed', {
                opponentName: player.name,
                attempts: player.attempts,
                isCorrect: guessResult.isCorrect
            });

            
            if (guessResult.isCorrect) {
                finishedSet.add(player.id);
                this.finishedPlayers.set(party.code, finishedSet);
                
                
                player.hasFinished = true;
                player.finishedAt = Date.now();
                
                
                const players = Array.from(party.players.values());
                const opponentPlayer = players.find(p => p.id !== player.id);
                
                
                this.io.to(party.code).emit('player_finished', {
                    playerId: player.id,
                    playerName: player.name,
                    attempts: player.attempts,
                    isFirstToFinish: finishedSet.size === 1,
                    targetNumber: opponent.secretNumber, 
                    timeToFinish: Date.now() - party.gameState.roundStartTime || 0
                });

                
                if (finishedSet.size >= 2) {
                    
                    this.determineWinnerAndEndRound(party, finishedSet);
                } else if (finishedSet.size === 1) {
                    
                    const canOpponentWin = opponentPlayer.attempts < player.attempts;
                    
                    if (canOpponentWin) {
                        
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
                        
                        this.endRoundEarly(party, player.id, 'exceeded_attempts');
                    }
                }
            } else {
                
                const opponentFinished = Array.from(party.players.values()).find(p => 
                    p.id !== player.id && finishedSet.has(p.id)
                );
                
                if (opponentFinished && player.attempts >= opponentFinished.attempts) {
                    
                    this.endRoundEarly(party, opponentFinished.id, 'exceeded_attempts');
                    return;
                }
            }

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            this.finishedPlayers.set(party.code, new Set());

            
            this.startSelectionTimer(party);

            
            this.io.to(party.code).emit('next_round_started', {
                party: party.getDetailedState(),
                selectionTimeLimit: config.SELECTION_TIME_LIMIT
            });

        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
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

            
            player.wantsRematch = true;
            
            
            const allWantRematch = Array.from(party.players.values()).every(p => p.wantsRematch);
            
            if (allWantRematch) {
                
                party.rematch();
                
                
                party.players.forEach(p => p.wantsRematch = false);

                
                this.finishedPlayers.delete(party.code); 

                
                this.startSelectionTimer(party);

                
                this.io.to(party.code).emit('rematch_started', {
                    party: party.getDetailedState(),
                    selectionTimeLimit: config.SELECTION_TIME_LIMIT
                    
                });
            } else {
                
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

            
            party.gameState.phase = 'lobby';
            party.status = 'waiting';
            
            
            party.players.forEach(p => {
                p.resetForNewRound();
                p.wantsRematch = false;
            });

            
            this.finishedPlayers.delete(party.code);

            
            this.clearSelectionTimer(party.code);

            
            this.io.to(party.code).emit('settings_change_started', {
                party: party.getDetailedState(),
                message: `${player.name} requested settings change`
            });


        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    }

    
    handlePlayerTyping(socket, data) {
        const party = this.partyService.getPartyBySocket(socket.id);
        if (!party) return;

        const player = this.partyService.getPlayerBySocket(socket.id);
        if (!player) return;

        
        socket.to(party.code).emit('player_typing', {
            playerId: player.id,
            playerName: player.name,
            isTyping: data.isTyping
        });
    }

    
    handleHeartbeat(socket) {
        const player = this.partyService.getPlayerBySocket(socket.id);
        if (player) {
            player.updateActivity();
        }
        socket.emit('heartbeat_ack', { timestamp: Date.now() });
    }

    
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

    
    handleSocketError(socket, error) {
        socket.emit('error', { message: 'Socket error occurred' });
    }

    
    handleDisconnection(socket, reason) {
        
        const result = this.partyService.leaveParty(socket.id);
        if (result) {
            const { party, player, partyCode } = result;
            
            
            if (this.finishedPlayers.has(partyCode)) {
                this.finishedPlayers.get(partyCode).delete(player.id);
                if (this.finishedPlayers.get(partyCode).size === 0) {
                    this.finishedPlayers.delete(partyCode);
                }
            }

            
            if (party && !party.isEmpty() && party.gameState.phase === 'playing') {
                const remainingPlayer = Array.from(party.players.values())[0];
                
                
                this.io.to(partyCode).emit('game_ended_by_leave', {
                    winner: remainingPlayer.getPublicInfo(),
                    leftPlayer: player.getPublicInfo(),
                    message: `${player.name} disconnected. ${remainingPlayer.name} wins by default!`
                });
            } else if (!party.isEmpty()) {
                
                this.io.to(partyCode).emit('player_left', {
                    party: party.getPublicInfo(),
                    leftPlayer: player.getPublicInfo()
                });
            }

            
            if (party.isEmpty()) {
                this.clearSelectionTimer(partyCode);
                this.finishedPlayers.delete(partyCode);
            }
            
        }
    }

    
    startSelectionTimer(party) {
        
        this.clearSelectionTimer(party.code);

        let timeLeft = config.SELECTION_TIME_LIMIT;
        
        const timer = setInterval(() => {
            timeLeft--;
            
            
            this.io.to(party.code).emit('selection_timer', { timeLeft });
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                this.selectionTimers.delete(party.code);
                
                
                party.autoSelectNumbers();
                
                
                this.startPlayingPhase(party);
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

    
    startPlayingPhase(party) {
        try {
            party.startPlayingPhase();

            
            this.io.to(party.code).emit('playing_started', {
                party: party.getDetailedState()
            });

        } catch (error) {
            this.io.to(party.code).emit('error', { message: error.message });
        }
    }

    
    determineWinnerAndEndRound(party, finishedSet) {
        const players = Array.from(party.players.values());
        const finishedPlayers = players.filter(p => finishedSet.has(p.id));
        
        
        finishedPlayers.sort((a, b) => {
            if (a.attempts !== b.attempts) {
                return a.attempts - b.attempts;
            }
            return a.finishedAt - b.finishedAt; 
        });
        
        const winner = finishedPlayers[0];
        const loser = finishedPlayers[1];
        
        
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

    
    endRound(party, winnerId, additionalData = {}) {
        try {
            const result = party.endRound(winnerId);
            const { roundResult, isGameComplete, gameWinner } = result;

            
            this.finishedPlayers.delete(party.code);

            
            if (isGameComplete) {
                this.partyService.recordGameCompletion();
            }

            
            const roundSummary = this.gameService.generateRoundSummary(roundResult, party.gameSettings);
            roundSummary.additionalData = additionalData;

            
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

    
    cleanup() {
        this.selectionTimers.forEach(timer => clearInterval(timer));
        this.selectionTimers.clear();
        this.finishedPlayers.clear();
    }
}

module.exports = SocketService;