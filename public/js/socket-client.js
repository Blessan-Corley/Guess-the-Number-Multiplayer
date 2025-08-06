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
            console.error('Failed to initialize socket:', error);
            this.handleConnectionError(error);
        }
    }

    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            UI.updateConnectionStatus('connected');
            UI.hideLoadingOverlay();
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.isConnected = false;
            UI.updateConnectionStatus('disconnected');
            
            // Attempt reconnection for certain disconnect reasons
            if (reason === 'io server disconnect') {
                // Server initiated disconnect, don't reconnect
                UI.showNotification('Disconnected by server', 'error');
            } else {
                // Client side disconnect, attempt reconnection
                this.handleReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.handleConnectionError(error);
        });

        // Server acknowledgment
        this.socket.on('connected', (data) => {
            console.log('Server acknowledged connection:', data);
        });

        // Party management events
        this.socket.on('party_created', (data) => {
            console.log('Party created:', data);
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handlePartyCreated(data);
        });

        this.socket.on('party_joined', (data) => {
            console.log('Party joined:', data);
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handlePartyJoined(data);
        });

        this.socket.on('player_joined', (data) => {
            console.log('Player joined party:', data);
            Game.handlePlayerJoined(data);
        });

        this.socket.on('player_left', (data) => {
            console.log('Player left party:', data);
            Game.handlePlayerLeft(data);
        });

        this.socket.on('party_left', (data) => {
            console.log('Left party:', data);
            this.gameState = {
                playerId: null,
                partyCode: null,
                playerName: null,
                isHost: false
            };
            Game.handlePartyLeft(data);
        });

        // Game flow events
        this.socket.on('settings_updated', (data) => {
            console.log('Settings updated:', data);
            Game.handleSettingsUpdated(data);
        });

        this.socket.on('game_started', (data) => {
            console.log('Game started:', data);
            Game.handleGameStarted(data);
        });

        this.socket.on('player_ready', (data) => {
            console.log('Player ready:', data);
            Game.handlePlayerReady(data);
        });

        this.socket.on('selection_timer', (data) => {
            console.log('Selection timer:', data);
            Game.handleSelectionTimer(data);
        });

        this.socket.on('playing_started', (data) => {
            console.log('Playing phase started:', data);
            Game.handlePlayingStarted(data);
        });

        this.socket.on('guess_result', (data) => {
            console.log('Guess result:', data);
            Game.handleGuessResult(data);
        });

        this.socket.on('opponent_guessed', (data) => {
            console.log('Opponent made a guess:', data);
            Game.handleOpponentGuessed(data);
        });

        this.socket.on('round_ended', (data) => {
            console.log('Round ended:', data);
            Game.handleRoundEnded(data);
        });

        this.socket.on('next_round_started', (data) => {
            console.log('Next round started:', data);
            Game.handleNextRoundStarted(data);
        });

        this.socket.on('rematch_started', (data) => {
            console.log('Rematch started:', data);
            Game.handleRematchStarted(data);
        });

        // Communication events
        this.socket.on('player_typing', (data) => {
            Game.handlePlayerTyping(data);
        });

        this.socket.on('player_disconnected', (data) => {
            console.log('Player disconnected:', data);
            UI.showNotification(`${data.playerName} disconnected`, 'warning');
        });

        this.socket.on('player_reconnected', (data) => {
            console.log('Player reconnected:', data);
            UI.showNotification(`${data.playerName} reconnected`, 'success');
        });

        // Heartbeat
        this.socket.on('heartbeat_ack', (data) => {
            // Server acknowledged heartbeat
        });

        // Error handling
        this.socket.on('error', (data) => {
            console.error('Server error:', data);
            UI.showNotification(data.message || 'An error occurred', 'error');
        });

        // Reconnection events
        this.socket.on('reconnected', (data) => {
            console.log('Successfully reconnected:', data);
            this.gameState.playerId = data.player.id;
            this.gameState.partyCode = data.party.code;
            this.gameState.playerName = data.player.name;
            this.gameState.isHost = data.player.isHost;
            
            Game.handleReconnected(data);
            UI.showNotification('Reconnected successfully!', 'success');
        });

        this.socket.on('reconnect_failed', (data) => {
            console.error('Reconnection failed:', data);
            UI.showNotification('Failed to reconnect to game', 'error');
            Game.returnToWelcome();
        });
    }

    // Party management methods
    createParty(playerName) {
        if (!this.isConnected) {
            UI.showNotification('Not connected to server', 'error');
            return;
        }

        UI.showLoadingOverlay('Creating party...');
        this.socket.emit('create_party', { playerName });
    }

    joinParty(partyCode, playerName) {
        if (!this.isConnected) {
            UI.showNotification('Not connected to server', 'error');
            return;
        }

        UI.showLoadingOverlay('Joining party...');
        this.socket.emit('join_party', { partyCode, playerName });
    }

    leaveParty() {
        if (!this.isConnected) return;
        
        this.socket.emit('leave_party');
    }

    updateSettings(settings) {
        if (!this.isConnected || !this.gameState.isHost) return;
        
        this.socket.emit('update_settings', settings);
    }

    // Game flow methods
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

    // Communication methods
    sendTyping(isTyping) {
        if (!this.isConnected) return;
        
        this.socket.emit('player_typing', { isTyping });
    }

    sendHeartbeat() {
        if (!this.isConnected) return;
        
        this.socket.emit('heartbeat');
    }

    // Connection management
    handleConnectionError(error) {
        console.error('Connection error:', error);
        this.isConnected = false;
        UI.updateConnectionStatus('disconnected');
        UI.showNotification('Connection error. Retrying...', 'error');
        this.handleReconnection();
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            UI.showNotification('Unable to connect to server. Please refresh the page.', 'error');
            return;
        }

        this.reconnectAttempts++;
        UI.updateConnectionStatus('connecting');
        
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                if (this.gameState.partyCode && this.gameState.playerId) {
                    // Attempt to reconnect to existing game
                    this.attemptGameReconnection();
                } else {
                    // General reconnection
                    this.socket.connect();
                }
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    attemptGameReconnection() {
        console.log('Attempting to reconnect to game...');
        this.socket.emit('reconnect_attempt', {
            partyCode: this.gameState.partyCode,
            playerId: this.gameState.playerId
        });
    }

    startHeartbeat() {
        // Send heartbeat every 30 seconds
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

    // Utility methods
    getGameState() {
        return { ...this.gameState };
    }

    isInGame() {
        return this.gameState.partyCode !== null;
    }

    isHost() {
        return this.gameState.isHost;
    }

    // Cleanup
    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    // Debug methods
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            socketId: this.socket?.id,
            reconnectAttempts: this.reconnectAttempts,
            gameState: this.gameState
        };
    }
}

// Initialize socket client
const socketClient = new SocketClient();

// Make it globally available
window.socketClient = socketClient;