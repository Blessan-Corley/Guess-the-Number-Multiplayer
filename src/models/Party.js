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
        this.status = 'waiting'; // waiting, selecting, playing, finished
        this.currentRound = 1;
        this.maxRounds = 1;
        this.gameSettings = {
            rangeStart: config.DEFAULT_RANGE_START,
            rangeEnd: config.DEFAULT_RANGE_END,
            selectionTimeLimit: config.SELECTION_TIME_LIMIT
            // bestOfThree removed - single round matches only
        };
        this.gameState = {
            phase: 'lobby', // lobby, selection, playing, results
            selectionTimer: null,
            winnerId: null,
            roundResults: []
        };
        this.stats = {
            totalRounds: 0,
            gamesCompleted: 0,
            totalGuesses: 0
        };

        // Add host player
        hostPlayer.isHost = true;
        this.addPlayer(hostPlayer);
    }

    // Add a player to the party
    addPlayer(player) {
        if (this.players.size >= config.MAX_PLAYERS_PER_PARTY) {
            throw new Error('Party is full');
        }

        this.players.set(player.id, player);
        this.updateActivity();
        return true;
    }

    // Remove a player from the party
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        
        // FIXED: If host leaves, close the entire party
        if (playerId === this.hostId) {
            // Host left - party should be closed, no host transfer
            this.status = 'closed';
            this.gameState.phase = 'finished';
            console.log(`Host left party ${this.code} - party will be closed`);
            return 'HOST_LEFT'; // Special return value
        }

        this.updateActivity();
        return true;
    }

    // Get player by ID
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    // Get player by socket ID
    getPlayerBySocketId(socketId) {
        return Array.from(this.players.values()).find(player => player.socketId === socketId);
    }

    // Get host player
    getHost() {
        return this.players.get(this.hostId);
    }

    // Check if party is full
    isFull() {
        return this.players.size >= config.MAX_PLAYERS_PER_PARTY;
    }

    // Check if party is empty
    isEmpty() {
        return this.players.size === 0;
    }

    // Check if all players are ready
    allPlayersReady() {
        if (this.players.size < 2) return false;
        return Array.from(this.players.values()).every(player => player.isReady);
    }

    // Update party activity timestamp
    updateActivity() {
        this.lastActivity = Date.now();
    }

    // Check if party is inactive
    isInactive(timeoutMs = config.INACTIVITY_TIMEOUT) {
        return Date.now() - this.lastActivity > timeoutMs;
    }

    // Update game settings (only host can do this)
    updateSettings(settings, hostId) {
        if (hostId !== this.hostId) {
            throw new Error('Only host can update settings');
        }

        // Allow settings changes in lobby, results, and finished phases
        if (this.gameState.phase === 'selection' || this.gameState.phase === 'playing') {
            throw new Error('Cannot update settings during active game');
        }

        // Validate settings
        if (settings.rangeStart !== undefined) {
            if (typeof settings.rangeStart !== 'number' || settings.rangeStart < 1) {
                throw new Error('Invalid range start');
            }
            // Enhanced validation for expanded range
            if (settings.rangeStart > 10000) {
                throw new Error('Range start cannot exceed 10000');
            }
            this.gameSettings.rangeStart = settings.rangeStart;
        }

        if (settings.rangeEnd !== undefined) {
            if (typeof settings.rangeEnd !== 'number' || settings.rangeEnd <= this.gameSettings.rangeStart) {
                throw new Error('Invalid range end');
            }
            // Enhanced validation for expanded range
            if (settings.rangeEnd > 10000) {
                throw new Error('Range end cannot exceed 10000');
            }
            this.gameSettings.rangeEnd = settings.rangeEnd;
        }

        // bestOfThree setting removed - always single round
        this.maxRounds = 1;

        this.updateActivity();
        return this.gameSettings;
    }

    // Start the game
    startGame(hostId) {
        if (hostId !== this.hostId) {
            throw new Error('Only host can start the game');
        }

        if (this.players.size < 2) {
            throw new Error('Need at least 2 players to start');
        }

        if (this.gameState.phase !== 'lobby') {
            throw new Error('Game already started');
        }

        // Reset all players for new game
        this.players.forEach(player => {
            player.resetForNewGame();
        });

        this.currentRound = 1;
        this.gameState.phase = 'selection';
        this.gameState.roundResults = [];
        this.status = 'selecting';
        this.updateActivity();

        return true;
    }

    // Start selection phase
    startSelectionPhase() {
        if (this.gameState.phase !== 'selection') {
            throw new Error('Invalid phase for selection');
        }

        // Reset players for new round
        this.players.forEach(player => {
            player.resetForNewRound();
        });

        this.updateActivity();
        return true;
    }

    // Set player ready with secret number
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
        this.updateActivity();

        // Check if all players are ready
        if (this.allPlayersReady()) {
            this.startPlayingPhase();
        }

        return true;
    }

    // Auto-select numbers for players who haven't chosen
    autoSelectNumbers() {
        this.players.forEach(player => {
            if (!player.isReady) {
                const randomNumber = Math.floor(
                    Math.random() * (this.gameSettings.rangeEnd - this.gameSettings.rangeStart + 1)
                ) + this.gameSettings.rangeStart;
                player.setReady(randomNumber);
            }
        });

        if (this.allPlayersReady()) {
            this.startPlayingPhase();
        }
    }

    // Start playing phase
    startPlayingPhase() {
        if (!this.allPlayersReady()) {
            throw new Error('Not all players are ready');
        }

        this.gameState.phase = 'playing';
        this.status = 'playing';
        this.updateActivity();
        return true;
    }

    // Make a guess
    makeGuess(playerId, guess) {
        const player = this.getPlayer(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        if (this.gameState.phase !== 'playing') {
            throw new Error('Not in playing phase');
        }

        // Validate guess
        const validation = player.validateGuess(
            guess, 
            this.gameSettings.rangeStart, 
            this.gameSettings.rangeEnd
        );
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Find opponent
        const opponent = Array.from(this.players.values()).find(p => p.id !== playerId);
        if (!opponent) {
            throw new Error('Opponent not found');
        }

        // Make the guess
        const guessResult = player.makeGuess(guess, opponent.secretNumber);
        this.stats.totalGuesses++;
        this.updateActivity();

        // Don't immediately end round - let SocketService manage when both players finish
        // The SocketService will call endRound when appropriate
        
        return guessResult;
    }

    // End current round
    endRound(winnerId) {
        if (this.gameState.phase !== 'playing') {
            throw new Error('Not in playing phase');
        }

        const winner = this.getPlayer(winnerId);
        if (!winner) {
            throw new Error('Winner not found');
        }

        // Record round result
        const roundResult = {
            round: this.currentRound,
            winnerId: winnerId,
            winnerName: winner.name,
            winnerAttempts: winner.attempts,
            timestamp: Date.now(),
            players: Array.from(this.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                attempts: player.attempts,
                secretNumber: player.secretNumber
            }))
        };

        this.gameState.roundResults.push(roundResult);
        winner.recordWin();
        
        // Record loss for other players
        this.players.forEach(player => {
            if (player.id !== winnerId) {
                player.recordLoss();
            }
        });

        this.stats.totalRounds++;
        this.gameState.phase = 'results';
        this.updateActivity();

        // Check if game is complete
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

    // Check if game is complete
    isGameComplete() {
        if (this.currentRound >= this.maxRounds) {
            return true;
        }

        // For best of 3, check if someone has already won majority
        if (this.maxRounds === 3 && this.currentRound >= 2) {
            const winCounts = new Map();
            this.gameState.roundResults.forEach(result => {
                winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
            });
            
            // If someone has 2 wins in best of 3, game is over
            return Array.from(winCounts.values()).some(wins => wins >= 2);
        }

        return false;
    }

    // Get game winner
    getGameWinner() {
        const winCounts = new Map();
        this.gameState.roundResults.forEach(result => {
            winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
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

    // End the game
    endGame() {
        this.gameState.phase = 'finished';
        this.status = 'finished';
        this.stats.gamesCompleted++;
        this.updateActivity();
        return true;
    }

    // Start next round
    nextRound() {
        if (this.gameState.phase !== 'results') {
            throw new Error('Not in results phase');
        }

        if (this.isGameComplete()) {
            throw new Error('Game is already complete');
        }

        this.currentRound++;
        this.gameState.phase = 'selection';
        this.status = 'selecting';
        this.updateActivity();
        return true;
    }

    // Rematch - start a new game with same players and settings
    rematch() {
        if (this.players.size < 2) {
            throw new Error('Need at least 2 players for rematch');
        }

        // FIXED: Direct rematch goes to selection phase
        this.currentRound = 1;
        this.gameState = {
            phase: 'selection', // Direct to selection for rematch
            selectionTimer: null,
            winnerId: null,
            roundResults: []
        };
        this.status = 'selecting'; // Direct to selecting

        // FIXED: Reset all players but preserve host status
        this.players.forEach(player => {
            const wasHost = player.isHost;
            player.resetForNewGame();
            player.isHost = wasHost; // Preserve host status
            player.wantsRematch = false; // Clear rematch flag
        });

        this.updateActivity();
        return true;
    }

    // Get party statistics
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
            players: playerStats,
            roundResults: this.gameState.roundResults
        };
    }

    // Get public party info
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
            gameSettings: this.gameSettings,
            players: Array.from(this.players.values()).map(player => player.getPublicInfo())
        };
    }

    // Get detailed party state (for players in the party)
    getDetailedState() {
        return {
            ...this.getPublicInfo(),
            gameState: {
                phase: this.gameState.phase,
                currentRound: this.currentRound,
                maxRounds: this.maxRounds,
                roundResults: this.gameState.roundResults,
                winnerId: this.gameState.winnerId
            },
            stats: this.stats
        };
    }

    // Validate party state
    validateState() {
        const errors = [];

        if (this.players.size === 0) {
            errors.push('Party has no players');
        }

        if (this.hostId && !this.players.has(this.hostId)) {
            errors.push('Host player not found in party');
        }

        if (this.gameSettings.rangeStart >= this.gameSettings.rangeEnd) {
            errors.push('Invalid game range');
        }

        const connectedPlayers = Array.from(this.players.values()).filter(p => p.isConnected);
        if (connectedPlayers.length === 0) {
            errors.push('No connected players');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Handle player reconnection
    reconnectPlayer(playerId, newSocketId) {
        const player = this.getPlayer(playerId);
        if (!player) {
            return false;
        }

        player.updateSocketId(newSocketId);
        this.updateActivity();
        return true;
    }

    // Serialize party for storage/transmission
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
            gameState: this.gameState,
            stats: this.stats,
            players: Array.from(this.players.values()).map(player => player.toJSON())
        };
    }

    // Create party from JSON data
    static fromJSON(data) {
        // This would be used for persistence/recovery
        // Implementation depends on storage requirements
        throw new Error('fromJSON not implemented - add if persistence needed');
    }
}

module.exports = Party;