const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');

class Party {
    constructor(partyCode, hostPlayer) {
        this.id = uuidv4();
        this.code = partyCode;
        this.players = new Map();
        this.hostId = hostPlayer.id;
        this.createdAt = Date.now();
        this.lastActivity = Date.now();
        this.status = 'waiting';
        this.currentRound = 1;
        this.maxRounds = 1;
        
        this.gameSettings = {
            rangeStart: config.DEFAULT_RANGE_START,
            rangeEnd: config.DEFAULT_RANGE_END,
            selectionTimeLimit: config.SELECTION_TIME_LIMIT
        };
        
        this.gameState = {
            phase: 'lobby',
            selectionTimer: null,
            roundStartTime: null,
            winnerId: null,
            roundResults: [],
            playersReady: new Set()
        };
        
        this.stats = {
            totalRounds: 0,
            gamesCompleted: 0,
            totalGuesses: 0,
            averageRoundDuration: 0,
            roundDurations: []
        };

        // State validation
        this._stateVersion = 0;
        this._lastStateChange = Date.now();

        hostPlayer.isHost = true;
        this.addPlayer(hostPlayer);
    }

    // Player management with validation
    addPlayer(player) {
        if (this.players.size >= config.MAX_PLAYERS_PER_PARTY) {
            throw new Error('Party is full');
        }

        if (this.players.has(player.id)) {
            throw new Error('Player already in party');
        }

        this.players.set(player.id, player);
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        
        // Clean up state
        this.gameState.playersReady.delete(playerId);
        
        if (playerId === this.hostId) {
            this.status = 'closed';
            this.gameState.phase = 'finished';
            this._incrementStateVersion();
            return 'HOST_LEFT';
        }

        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    getPlayerBySocketId(socketId) {
        return Array.from(this.players.values())
            .find(player => player.socketId === socketId);
    }

    getHost() {
        return this.players.get(this.hostId);
    }

    isFull() {
        return this.players.size >= config.MAX_PLAYERS_PER_PARTY;
    }

    isEmpty() {
        return this.players.size === 0;
    }

    allPlayersReady() {
        if (this.players.size < 2) return false;
        return Array.from(this.players.values())
            .every(player => player.isReady);
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }

    isInactive(timeoutMs = config.INACTIVITY_TIMEOUT) {
        return Date.now() - this.lastActivity > timeoutMs;
    }

    // Enhanced settings update with rollback
    updateSettings(settings, hostId) {
        if (hostId !== this.hostId) {
            throw new Error('Only host can update settings');
        }

        if (this.gameState.phase !== 'lobby') {
            throw new Error('Cannot update settings during active game');
        }

        // Store previous settings for potential rollback
        const previousSettings = { ...this.gameSettings };

        try {
            // Validate and apply new settings
            if (settings.rangeStart !== undefined) {
                const start = parseInt(settings.rangeStart);
                if (isNaN(start) || start < 1 || start > 10000) {
                    throw new Error('Invalid range start (must be 1-10000)');
                }
                this.gameSettings.rangeStart = start;
            }

            if (settings.rangeEnd !== undefined) {
                const end = parseInt(settings.rangeEnd);
                if (isNaN(end) || end < 2 || end > 10000) {
                    throw new Error('Invalid range end (must be 2-10000)');
                }
                this.gameSettings.rangeEnd = end;
            }

            // Validate range
            if (this.gameSettings.rangeEnd <= this.gameSettings.rangeStart) {
                throw new Error('Range end must be greater than range start');
            }

            const rangeSize = this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1;
            if (rangeSize < config.MIN_RANGE_SIZE) {
                throw new Error(`Range must be at least ${config.MIN_RANGE_SIZE} numbers`);
            }

            if (rangeSize > config.MAX_RANGE_SIZE) {
                throw new Error(`Range cannot exceed ${config.MAX_RANGE_SIZE} numbers`);
            }

            this.updateActivity();
            this._incrementStateVersion();
            return this.gameSettings;

        } catch (error) {
            // Rollback on error
            this.gameSettings = previousSettings;
            throw error;
        }
    }

    // Enhanced game start with validation
    startGame(hostId) {
        if (hostId !== this.hostId) {
            throw new Error('Only host can start the game');
        }

        if (this.players.size < 2) {
            throw new Error('Need exactly 2 players to start');
        }

        if (this.gameState.phase !== 'lobby') {
            throw new Error('Game already started');
        }

        // Validate all players are connected
        const disconnectedPlayers = Array.from(this.players.values())
            .filter(p => !p.isConnected);
        
        if (disconnectedPlayers.length > 0) {
            throw new Error('Cannot start - not all players are connected');
        }

        // Reset all players
        this.players.forEach(player => {
            player.resetForNewGame();
        });

        this.currentRound = 1;
        this.gameState.phase = 'selection';
        this.gameState.roundResults = [];
        this.gameState.playersReady.clear();
        this.gameState.roundStartTime = Date.now();
        this.status = 'selecting';
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    startSelectionPhase() {
        if (this.gameState.phase !== 'selection') {
            throw new Error('Invalid phase for selection');
        }

        this.players.forEach(player => {
            player.resetForNewRound();
        });

        this.gameState.playersReady.clear();
        this.gameState.roundStartTime = Date.now();
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    setPlayerReady(playerId, secretNumber) {
        const player = this.getPlayer(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (this.gameState.phase !== 'selection') {
            throw new Error('Not in selection phase');
        }

        // Validate secret number
        const validation = player.validateSecretNumber(
            secretNumber,
            this.gameSettings.rangeStart,
            this.gameSettings.rangeEnd
        );
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        player.setReady(secretNumber);
        this.gameState.playersReady.add(playerId);
        this.updateActivity();
        this._incrementStateVersion();

        // Auto-start if all ready
        if (this.allPlayersReady()) {
            this.startPlayingPhase();
        }

        return true;
    }

    autoSelectNumbers() {
        this.players.forEach(player => {
            if (!player.isReady) {
                const randomNumber = Math.floor(
                    Math.random() * (this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1)
                ) + this.gameSettings.rangeStart;
                player.setReady(randomNumber);
                this.gameState.playersReady.add(player.id);
            }
        });

        if (this.allPlayersReady()) {
            this.startPlayingPhase();
        }

        this._incrementStateVersion();
    }

    startPlayingPhase() {
        if (!this.allPlayersReady()) {
            throw new Error('Not all players are ready');
        }

        this.gameState.phase = 'playing';
        this.gameState.roundStartTime = Date.now();
        this.status = 'playing';
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    makeGuess(playerId, guess) {
        const player = this.getPlayer(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (this.gameState.phase !== 'playing') {
            throw new Error('Not in playing phase');
        }

        // Check if player already finished
        if (player.hasFinished) {
            throw new Error('You have already found the number');
        }

        const validation = player.validateGuess(
            guess,
            this.gameSettings.rangeStart,
            this.gameSettings.rangeEnd
        );
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const opponent = Array.from(this.players.values())
            .find(p => p.id !== playerId);
        
        if (!opponent) {
            throw new Error('Opponent not found');
        }

        const guessResult = player.makeGuess(guess, opponent.secretNumber);
        this.stats.totalGuesses++;
        
        this.updateActivity();
        this._incrementStateVersion();
        
        return guessResult;
    }

    endRound(winnerId) {
        if (this.gameState.phase !== 'playing') {
            throw new Error('Not in playing phase');
        }

        const winner = this.getPlayer(winnerId);
        if (!winner) {
            throw new Error('Winner not found');
        }

        // Calculate round duration
        const roundDuration = Date.now() - (this.gameState.roundStartTime || Date.now());
        this.stats.roundDurations.push(roundDuration);
        
        if (this.stats.roundDurations.length > 0) {
            this.stats.averageRoundDuration = Math.floor(
                this.stats.roundDurations.reduce((a, b) => a + b, 0) / 
                this.stats.roundDurations.length
            );
        }

        const roundResult = {
            round: this.currentRound,
            winnerId: winnerId,
            winnerName: winner.name,
            winnerAttempts: winner.attempts,
            timestamp: Date.now(),
            duration: roundDuration,
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                attempts: player.attempts,
                secretNumber: player.secretNumber
            }))
        };

        this.gameState.roundResults.push(roundResult);
        this.gameState.winnerId = winnerId;
        
        winner.recordWin();
        this.players.forEach(player => {
            if (player.id !== winnerId) {
                player.recordLoss();
            }
        });

        this.stats.totalRounds++;
        this.gameState.phase = 'results';
        
        this.updateActivity();
        this._incrementStateVersion();

        const isGameComplete = this.isGameComplete();
        if (isGameComplete) {
            this.endGame();
        }

        return {
            roundResult,
            isGameComplete,
            gameWinner: isGameComplete ? this.getGameWinner() : null
        };
    }

    isGameComplete() {
        return this.currentRound >= this.maxRounds;
    }

    getGameWinner() {
        const winCounts = new Map();
        this.gameState.roundResults.forEach(result => {
            winCounts.set(
                result.winnerId,
                (winCounts.get(result.winnerId) || 0) + 1
            );
        });

        let maxWins = 0;
        let winnerId = null;

        winCounts.forEach((wins, playerId) => {
            if (wins > maxWins) {
                maxWins = wins;
                winnerId = playerId;
            }
        });

        return winnerId ? this.getPlayer(winnerId) : null;
    }

    endGame() {
        this.gameState.phase = 'finished';
        this.status = 'finished';
        this.stats.gamesCompleted++;
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    nextRound() {
        if (this.gameState.phase !== 'results') {
            throw new Error('Not in results phase');
        }

        if (this.isGameComplete()) {
            throw new Error('Game is already complete');
        }

        this.currentRound++;
        this.gameState.phase = 'selection';
        this.gameState.playersReady.clear();
        this.gameState.roundStartTime = null;
        this.status = 'selecting';
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    rematch() {
        if (this.players.size < 2) {
            throw new Error('Need 2 players for rematch');
        }

        // Validate players are still connected
        const disconnectedPlayers = Array.from(this.players.values())
            .filter(p => !p.isConnected);
        
        if (disconnectedPlayers.length > 0) {
            throw new Error('Cannot rematch - not all players are connected');
        }

        this.currentRound = 1;
        this.gameState = {
            phase: 'selection',
            selectionTimer: null,
            roundStartTime: Date.now(),
            winnerId: null,
            roundResults: [],
            playersReady: new Set()
        };
        this.status = 'selecting';

        this.players.forEach(player => {
            const wasHost = player.isHost;
            player.resetForNewGame();
            player.isHost = wasHost;
            player.wantsRematch = false;
        });

        // Reset round durations but keep total stats
        this.stats.roundDurations = [];
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    // State management helpers
    _incrementStateVersion() {
        this._stateVersion++;
        this._lastStateChange = Date.now();
    }

    getStateVersion() {
        return this._stateVersion;
    }

    // Enhanced validation
    validateState() {
        const errors = [];

        if (this.players.size === 0) {
            errors.push('Party has no players');
        }

        if (this.players.size > config.MAX_PLAYERS_PER_PARTY) {
            errors.push('Party exceeds maximum players');
        }

        if (this.hostId && !this.players.has(this.hostId)) {
            errors.push('Host player not found in party');
        }

        if (this.gameSettings.rangeStart >= this.gameSettings.rangeEnd) {
            errors.push('Invalid game range');
        }

        const rangeSize = this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1;
        if (rangeSize < config.MIN_RANGE_SIZE || rangeSize > config.MAX_RANGE_SIZE) {
            errors.push('Game range size out of bounds');
        }

        const connectedPlayers = Array.from(this.players.values())
            .filter(p => p.isConnected);
        
        if (connectedPlayers.length === 0) {
            errors.push('No connected players');
        }

        // Validate phase-specific state
        if (this.gameState.phase === 'playing') {
            const allHaveSecretNumbers = Array.from(this.players.values())
                .every(p => p.secretNumber !== null);
            
            if (!allHaveSecretNumbers) {
                errors.push('Not all players have secret numbers in playing phase');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            stateVersion: this._stateVersion
        };
    }

    // Reconnection support
    reconnectPlayer(playerId, newSocketId) {
        const player = this.getPlayer(playerId);
        if (!player) {
            return false;
        }

        player.updateSocketId(newSocketId);
        player.setConnected(true);
        
        this.updateActivity();
        this._incrementStateVersion();
        return true;
    }

    getStats() {
        const playerStats = Array.from(this.players.values()).map(player => ({
            id: player.id,
            name: player.name,
            performance: player.getSessionPerformance()
        }));

        return {
            partyId: this.id,
            code: this.code,
            createdAt: this.createdAt,
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            totalRounds: this.stats.totalRounds,
            gamesCompleted: this.stats.gamesCompleted,
            totalGuesses: this.stats.totalGuesses,
            averageRoundDuration: this.stats.averageRoundDuration,
            players: playerStats,
            roundResults: this.gameState.roundResults,
            stateVersion: this._stateVersion
        };
    }

    getPublicInfo() {
        return {
            id: this.id,
            code: this.code,
            createdAt: this.createdAt,
            status: this.status,
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            phase: this.gameState.phase,
            playerCount: this.players.size,
            isFull: this.isFull(),
            gameSettings: { ...this.gameSettings },
            players: Array.from(this.players.values())
                .map(player => player.getPublicInfo()),
            stateVersion: this._stateVersion
        };
    }

    getDetailedState() {
        return {
            ...this.getPublicInfo(),
            gameState: {
                phase: this.gameState.phase,
                currentRound: this.currentRound,
                maxRounds: this.maxRounds,
                roundResults: this.gameState.roundResults,
                winnerId: this.gameState.winnerId,
                playersReady: Array.from(this.gameState.playersReady),
                roundStartTime: this.gameState.roundStartTime
            },
            stats: { ...this.stats },
            lastActivity: this.lastActivity
        };
    }

    toJSON() {
        return {
            id: this.id,
            code: this.code,
            hostId: this.hostId,
            createdAt: this.createdAt,
            lastActivity: this.lastActivity,
            status: this.status,
            currentRound: this.currentRound,
            maxRounds: this.maxRounds,
            gameSettings: this.gameSettings,
            gameState: {
                ...this.gameState,
                playersReady: Array.from(this.gameState.playersReady)
            },
            stats: this.stats,
            players: Array.from(this.players.values()).map(p => p.toJSON()),
            _stateVersion: this._stateVersion,
            _lastStateChange: this._lastStateChange
        };
    }

    static fromJSON(data) {
        // Create a shell instance - we can't use constructor easily because it expects a hostPlayer
        const party = Object.create(Party.prototype);
        const Player = require('./Player');

        // Restore properties
        party.id = data.id;
        party.code = data.code;
        party.hostId = data.hostId;
        party.createdAt = data.createdAt;
        party.lastActivity = data.lastActivity;
        party.status = data.status;
        party.currentRound = data.currentRound;
        party.maxRounds = data.maxRounds;
        party.gameSettings = data.gameSettings;
        
        // Restore complex state
        party.gameState = {
            ...data.gameState,
            playersReady: new Set(data.gameState.playersReady)
        };
        
        party.stats = data.stats;
        party._stateVersion = data._stateVersion;
        party._lastStateChange = data._lastStateChange;

        // Restore players map
        party.players = new Map();
        if (data.players && Array.isArray(data.players)) {
            data.players.forEach(playerData => {
                const player = Player.fromJSON(playerData);
                party.players.set(player.id, player);
            });
        }

        return party;
    }
}

module.exports = Party;