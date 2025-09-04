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
            winnerId: null,
            roundResults: []
        };
        this.stats = {
            totalRounds: 0,
            gamesCompleted: 0,
            totalGuesses: 0
        };

        
        hostPlayer.isHost = true;
        this.addPlayer(hostPlayer);
    }

    
    addPlayer(player) {
        if (this.players.size >= config.MAX_PLAYERS_PER_PARTY) {
            throw new Error('Party is full');
        }

        this.players.set(player.id, player);
        this.updateActivity();
        return true;
    }

    
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        
        
        if (playerId === this.hostId) {
            
            this.status = 'closed';
            this.gameState.phase = 'finished';
            return 'HOST_LEFT'; 
        }

        this.updateActivity();
        return true;
    }

    
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    
    getPlayerBySocketId(socketId) {
        return Array.from(this.players.values()).find(player => player.socketId === socketId);
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
        return Array.from(this.players.values()).every(player => player.isReady);
    }

    
    updateActivity() {
        this.lastActivity = Date.now();
    }

    
    isInactive(timeoutMs = config.INACTIVITY_TIMEOUT) {
        return Date.now() - this.lastActivity > timeoutMs;
    }

    
    updateSettings(settings, hostId) {
        if (hostId !== this.hostId) {
            throw new Error('Only host can update settings');
        }

        
        if (this.gameState.phase === 'selection' || this.gameState.phase === 'playing') {
            throw new Error('Cannot update settings during active game');
        }

        
        if (settings.rangeStart !== undefined) {
            if (typeof settings.rangeStart !== 'number' || settings.rangeStart < 1) {
                throw new Error('Invalid range start');
            }
            
            if (settings.rangeStart > 10000) {
                throw new Error('Range start cannot exceed 10000');
            }
            this.gameSettings.rangeStart = settings.rangeStart;
        }

        if (settings.rangeEnd !== undefined) {
            if (typeof settings.rangeEnd !== 'number' || settings.rangeEnd <= this.gameSettings.rangeStart) {
                throw new Error('Invalid range end');
            }
            
            if (settings.rangeEnd > 10000) {
                throw new Error('Range end cannot exceed 10000');
            }
            this.gameSettings.rangeEnd = settings.rangeEnd;
        }

        
        this.maxRounds = 1;

        this.updateActivity();
        return this.gameSettings;
    }

    
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

    
    startSelectionPhase() {
        if (this.gameState.phase !== 'selection') {
            throw new Error('Invalid phase for selection');
        }

        
        this.players.forEach(player => {
            player.resetForNewRound();
        });

        this.updateActivity();
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
            }
        });

        if (this.allPlayersReady()) {
            this.startPlayingPhase();
        }
    }

    
    startPlayingPhase() {
        if (!this.allPlayersReady()) {
            throw new Error('Not all players are ready');
        }

        this.gameState.phase = 'playing';
        this.status = 'playing';
        this.updateActivity();
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

        
        const validation = player.validateGuess(
            guess, 
            this.gameSettings.rangeStart, 
            this.gameSettings.rangeEnd
        );
        
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        
        const opponent = Array.from(this.players.values()).find(p => p.id !== playerId);
        if (!opponent) {
            throw new Error('Opponent not found');
        }

        
        const guessResult = player.makeGuess(guess, opponent.secretNumber);
        this.stats.totalGuesses++;
        this.updateActivity();

        
        
        
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
        
        
        this.players.forEach(player => {
            if (player.id !== winnerId) {
                player.recordLoss();
            }
        });

        this.stats.totalRounds++;
        this.gameState.phase = 'results';
        this.updateActivity();

        
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
        if (this.currentRound >= this.maxRounds) {
            return true;
        }

        
        if (this.maxRounds === 3 && this.currentRound >= 2) {
            const winCounts = new Map();
            this.gameState.roundResults.forEach(result => {
                winCounts.set(result.winnerId, (winCounts.get(result.winnerId) || 0) + 1);
            });
            
            
            return Array.from(winCounts.values()).some(wins => wins >= 2);
        }

        return false;
    }

    
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

    
    endGame() {
        this.gameState.phase = 'finished';
        this.status = 'finished';
        this.stats.gamesCompleted++;
        this.updateActivity();
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
        this.status = 'selecting';
        this.updateActivity();
        return true;
    }

    
    rematch() {
        if (this.players.size < 2) {
            throw new Error('Need at least 2 players for rematch');
        }

        
        this.currentRound = 1;
        this.gameState = {
            phase: 'selection', 
            selectionTimer: null,
            winnerId: null,
            roundResults: []
        };
        this.status = 'selecting'; 

        
        this.players.forEach(player => {
            const wasHost = player.isHost;
            player.resetForNewGame();
            player.isHost = wasHost; 
            player.wantsRematch = false; 
        });

        this.updateActivity();
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
            players: playerStats,
            roundResults: this.gameState.roundResults
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
            gameSettings: this.gameSettings,
            players: Array.from(this.players.values()).map(player => player.getPublicInfo())
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
                winnerId: this.gameState.winnerId
            },
            stats: this.stats
        };
    }

    
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

    
    reconnectPlayer(playerId, newSocketId) {
        const player = this.getPlayer(playerId);
        if (!player) {
            return false;
        }

        player.updateSocketId(newSocketId);
        this.updateActivity();
        return true;
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
            gameState: this.gameState,
            stats: this.stats,
            players: Array.from(this.players.values()).map(player => player.toJSON())
        };
    }

    
    static fromJSON(data) {
        
        
        throw new Error('fromJSON not implemented - add if persistence needed');
    }
}

module.exports = Party;