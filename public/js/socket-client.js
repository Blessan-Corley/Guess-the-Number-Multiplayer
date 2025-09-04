class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.heartbeatInterval = null;
        this.gameState = {
            playerId: null,
            partyCode: null,
            playerName: null,
            isHost: false
        };
        
        this.init();
    }

    init() {
        try {
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 20000,
                forceNew: true
            });

            this.setupEventListeners();
            this.startHeartbeat();
        } catch (error) {
            this.handleConnectionError(error);
        }
    }

    setupEventListeners() {
        
        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            if (typeof UI !== 'undefined') {
                UI.updateConnectionStatus('connected');
                if (typeof UI !== 'undefined') {
                UI.hideLoadingOverlay();
            }
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.isConnected = false;
            if (typeof UI !== 'undefined') {
                if (typeof UI !== 'undefined') {
            UI.updateConnectionStatus('disconnected');
        }
            }
            
            
            if (reason === 'io server disconnect') {
                
                if (typeof UI !== 'undefined') {
                    UI.showNotification('Disconnected by server', 'error');
                }
            } else {
                
                this.handleReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            this.handleConnectionError(error);
        });

        
        this.socket.on('connected', (data) => {
        });

        
        this.socket.on('party_created', (data) => {
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handlePartyCreated(data);
        });

        this.socket.on('party_joined', (data) => {
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handlePartyJoined(data);
        });

        this.socket.on('player_joined', (data) => {
            Game.handlePlayerJoined(data);
        });

        this.socket.on('player_left', (data) => {
            Game.handlePlayerLeft(data);
        });

        this.socket.on('party_left', (data) => {
            this.gameState = {
                playerId: null,
                partyCode: null,
                playerName: null,
                isHost: false
            };
            Game.handlePartyLeft(data);
        });
        
        
        this.socket.on('party_closed_host_left', (data) => {
            Game.handlePartyClosedHostLeft(data);
        });
        
        
        this.socket.on('settings_change_started', (data) => {
            Game.handleSettingsChangeStarted(data);
        });

        
        this.socket.on('settings_updated', (data) => {
            Game.handleSettingsUpdated(data);
        });

        this.socket.on('game_started', (data) => {
            Game.handleGameStarted(data);
        });

        this.socket.on('player_ready', (data) => {
            Game.handlePlayerReady(data);
        });

        this.socket.on('selection_timer', (data) => {
            Game.handleSelectionTimer(data);
        });

        this.socket.on('playing_started', (data) => {
            Game.handlePlayingStarted(data);
        });

        this.socket.on('guess_result', (data) => {
            Game.handleGuessResult(data);
        });

        this.socket.on('opponent_guessed', (data) => {
            Game.handleOpponentGuessed(data);
        });

        this.socket.on('round_ended', (data) => {
            Game.handleRoundEnded(data);
        });

        this.socket.on('next_round_started', (data) => {
            Game.handleNextRoundStarted(data);
        });

        this.socket.on('rematch_started', (data) => {
            Game.handleRematchStarted(data);
        });

        this.socket.on('rematch_requested', (data) => {
            Game.handleRematchRequested(data);
        });

        
        this.socket.on('player_typing', (data) => {
            Game.handlePlayerTyping(data);
        });

        this.socket.on('player_disconnected', (data) => {
            if (typeof UI !== 'undefined') {
                UI.showNotification(`${data.playerName} disconnected`, 'warning');
            }
        });

        this.socket.on('player_reconnected', (data) => {
            if (typeof UI !== 'undefined') {
                UI.showNotification(`${data.playerName} reconnected`, 'success');
            }
        });

        
        this.socket.on('opponent_finished_first', (data) => {
            Game.handleOpponentFinishedFirst(data);
        });

        this.socket.on('waiting_for_opponent', (data) => {
            Game.handleWaitingForOpponent(data);
        });

        this.socket.on('player_finished', (data) => {
            Game.handlePlayerFinished(data);
        });

        
        this.socket.on('heartbeat_ack', (data) => {
            
        });

        
        this.socket.on('error', (data) => {
            
            
            if (typeof UI !== 'undefined') {
                UI.hideLoadingOverlay();
            }
            
            
            const joinBtn = document.getElementById('joinPartySubmitBtn');
            if (joinBtn) {
                if (typeof UI !== 'undefined') {
                    UI.resetButton(joinBtn, '🚀 Join Party');
                }
            }
            
            
            let message = data.message || 'An error occurred';
            let type = 'error';
            
            if (data.type === 'party_full') {
                message = '🚫 Session is full! This party already has 2 players. Try creating a new party or wait for a spot to open.';
                type = 'warning';
            } else if (data.type === 'not_found') {
                message = '🔍 Party not found! Please check the party code and try again.';
                type = 'error';
            } else if (data.type === 'validation') {
                message = `❌ ${data.message}`;
                type = 'error';
            } else if (data.type === 'already_in_party') {
                message = '⚠️ You are already in a party! Please leave your current party first.';
                type = 'warning';
            }
            
            if (typeof UI !== 'undefined') {
                UI.showNotification(message, type, 5000); 
            }
        });

        
        this.socket.on('reconnected', (data) => {
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handleReconnected(data);
            if (typeof UI !== 'undefined') {
                UI.showNotification('Reconnected successfully!', 'success');
            }
        });

        this.socket.on('reconnect_failed', (data) => {
            if (typeof UI !== 'undefined') {
                UI.showNotification('Failed to reconnect to game', 'error');
            }
            Game.returnToWelcome();
        });
    }

    
    createParty(playerName) {
        if (!this.isConnected) {
            if (typeof UI !== 'undefined') {
            UI.showNotification('Not connected to server', 'error');
        }
            return;
        }

        if (typeof UI !== 'undefined') {
            UI.showLoadingOverlay('Creating party...');
        }
        this.socket.emit('create_party', { playerName });
        
        
        setTimeout(() => {
            if (document.querySelector('.loading-overlay.active')) {
                if (typeof UI !== 'undefined') {
                UI.hideLoadingOverlay();
            }
                if (typeof UI !== 'undefined') {
                UI.showNotification('⏱️ Request timed out. Please try again.', 'warning');
            }
            }
        }, 10000); 
    }

    joinParty(partyCode, playerName) {
        if (!this.isConnected) {
            if (typeof UI !== 'undefined') {
            UI.showNotification('Not connected to server', 'error');
        }
            return;
        }

        if (typeof UI !== 'undefined') {
            UI.showLoadingOverlay('Joining party...');
        }
        this.socket.emit('join_party', { partyCode, playerName });
        
        
        setTimeout(() => {
            if (document.querySelector('.loading-overlay.active')) {
                if (typeof UI !== 'undefined') {
                    UI.hideLoadingOverlay();
                    UI.showNotification('⏱️ Request timed out. Please try again.', 'warning');
                }
                
                
                const joinBtn = document.getElementById('joinPartySubmitBtn');
                if (joinBtn && typeof UI !== 'undefined') {
                    UI.resetButton(joinBtn, '🚀 Join Party');
                }
            }
        }, 10000); 
    }

    leaveParty() {
        if (!this.isConnected) return;
        
        this.socket.emit('leave_party');
    }

    updateSettings(settings) {
        if (!this.isConnected || !this.gameState.isHost) return;
        
        this.socket.emit('update_settings', settings);
    }

    
    startGame() {
        if (!this.isConnected || !this.gameState.isHost) return;
        
        this.socket.emit('start_game');
    }

    setReady(secretNumber) {
        if (!this.isConnected) return;
        
        this.socket.emit('set_ready', { secretNumber });
    }

    makeGuess(guess) {
        if (!this.isConnected) return;
        
        this.socket.emit('make_guess', { guess });
    }

    nextRound() {
        if (!this.isConnected || !this.gameState.isHost) return;
        
        this.socket.emit('next_round');
    }

    rematch() {
        if (!this.isConnected) return;
        
        this.socket.emit('rematch');
    }

    
    sendTyping(isTyping) {
        if (!this.isConnected) return;
        
        this.socket.emit('player_typing', { isTyping });
    }

    sendHeartbeat() {
        if (!this.isConnected) return;
        
        this.socket.emit('heartbeat');
    }

    
    handleConnectionError(error) {
        this.isConnected = false;
        if (typeof UI !== 'undefined') {
            UI.updateConnectionStatus('disconnected');
        }
        UI.showNotification('Connection error. Retrying...', 'error');
        this.handleReconnection();
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (typeof UI !== 'undefined') {
                UI.showNotification('Unable to connect to server. Please refresh the page.', 'error');
            }
            return;
        }

        this.reconnectAttempts++;
        if (typeof UI !== 'undefined') {
            UI.updateConnectionStatus('connecting');
        }
        
        
        setTimeout(() => {
            if (!this.isConnected) {
                if (this.gameState.partyCode && this.gameState.playerId) {
                    
                    this.attemptGameReconnection();
                } else {
                    
                    this.socket.connect();
                }
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    attemptGameReconnection() {
        this.socket.emit('reconnect_attempt', {
            partyCode: this.gameState.partyCode,
            playerId: this.gameState.playerId
        });
    }

    startHeartbeat() {
        
        this.heartbeatInterval = setInterval(() => {
            this.sendHeartbeat();
        }, 30000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    
    getGameState() {
        return { ...this.gameState };
    }

    isInGame() {
        return this.gameState.partyCode !== null;
    }

    isHost() {
        return this.gameState.isHost;
    }

    
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket?.id,
            reconnectAttempts: this.reconnectAttempts,
            gameState: this.gameState
        };
    }
}


const socketClient = new SocketClient();


window.socketClient = socketClient;