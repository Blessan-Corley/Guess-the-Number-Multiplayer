const { v4: uuidv4 } = require('uuid');

class Player {
    constructor(socketId, name) {
        this.id = uuidv4();
        this.socketId = socketId;
        this.name = name.trim().substring(0, 20); // Limit name length
        this.isHost = false;
        this.isConnected = true;
        this.isReady = false;
        this.secretNumber = null;
        this.attempts = 0;
        this.wins = 0;
        this.guessHistory = [];
        this.lastActivity = Date.now();
        this.joinedAt = Date.now();
        this.hasFinished = false; // New: track if player found the number
        this.finishedAt = null;   // New: timestamp when player finished
        this.wantsRematch = false; // Track rematch requests
        this.stats = {
            totalGames: 0,
            totalWins: 0,
            totalAttempts: 0,
            bestScore: null,
            averageAttempts: 0
        };
    }

    // Update player activity timestamp
    updateActivity() {
        this.lastActivity = Date.now();
    }

    // Set player as ready for the current round
    setReady(secretNumber = null) {
        this.isReady = true;
        if (secretNumber !== null) {
            this.secretNumber = secretNumber;
        }
        this.updateActivity();
    }

    // Reset player state for new round
    resetForNewRound() {
        this.isReady = false;
        this.secretNumber = null;
        this.attempts = 0;
        this.guessHistory = [];
        this.hasFinished = false;  // Reset finished status
        this.finishedAt = null;    // Reset finished timestamp
        this.wantsRematch = false; // Reset rematch flag
        this.updateActivity();
    }

    // Reset player state for new game
    resetForNewGame() {
        this.resetForNewRound();
        this.wins = 0;
    }

    // Make a guess
    makeGuess(guess, targetNumber) {
        this.attempts++;
        this.stats.totalAttempts++;
        
        const isCorrect = guess === targetNumber;
        const difference = Math.abs(guess - targetNumber);
        
        const guessResult = {
            attempt: this.attempts,
            guess: guess,
            target: targetNumber,
            isCorrect: isCorrect,
            difference: difference,
            timestamp: Date.now()
        };
        
        this.guessHistory.push(guessResult);
        this.updateActivity();
        
        // Mark as finished if correct
        if (isCorrect) {
            this.hasFinished = true;
            this.finishedAt = Date.now();
        }
        
        return guessResult;
    }

    // Record a win
    recordWin() {
        this.wins++;
        this.stats.totalWins++;
        this.stats.totalGames++;
        
        // Update best score (lowest attempts to win)
        if (this.stats.bestScore === null || this.attempts < this.stats.bestScore) {
            this.stats.bestScore = this.attempts;
        }
        
        this.updateStats();
    }

    // Record a loss
    recordLoss() {
        this.stats.totalGames++;
        this.updateStats();
    }

    // Update calculated stats
    updateStats() {
        if (this.stats.totalGames > 0) {
            this.stats.averageAttempts = Math.round(this.stats.totalAttempts / this.stats.totalGames * 100) / 100;
        }
    }

    // Set connection status
    setConnected(connected) {
        this.isConnected = connected;
        if (connected) {
            this.updateActivity();
        }
    }

    // Update socket ID (for reconnection)
    updateSocketId(newSocketId) {
        this.socketId = newSocketId;
        this.setConnected(true);
    }

    // Check if player is inactive
    isInactive(timeoutMs = 600000) { // 10 minutes default
        return Date.now() - this.lastActivity > timeoutMs;
    }

    // Get public player info (safe to send to other players)
    getPublicInfo() {
        return {
            id: this.id,
            name: this.name,
            isHost: this.isHost,
            isConnected: this.isConnected,
            isReady: this.isReady,
            attempts: this.attempts,
            wins: this.wins,
            joinedAt: this.joinedAt,
            stats: {
                totalGames: this.stats.totalGames,
                totalWins: this.stats.totalWins,
                bestScore: this.stats.bestScore,
                averageAttempts: this.stats.averageAttempts
            }
        };
    }

    // Get private player info (only for the player themselves)
    getPrivateInfo() {
        return {
            ...this.getPublicInfo(),
            secretNumber: this.secretNumber,
            guessHistory: this.guessHistory,
            lastActivity: this.lastActivity,
            stats: this.stats
        };
    }

    // Validate secret number for given range
    validateSecretNumber(number, rangeStart, rangeEnd) {
        if (typeof number !== 'number' || isNaN(number)) {
            return { valid: false, error: 'Secret number must be a valid number' };
        }
        
        if (number < rangeStart || number > rangeEnd) {
            return { 
                valid: false, 
                error: `Secret number must be between ${rangeStart} and ${rangeEnd}` 
            };
        }
        
        return { valid: true };
    }

    // Validate guess for given range
    validateGuess(guess, rangeStart, rangeEnd) {
        if (typeof guess !== 'number' || isNaN(guess)) {
            return { valid: false, error: 'Guess must be a valid number' };
        }
        
        if (guess < rangeStart || guess > rangeEnd) {
            return { 
                valid: false, 
                error: `Guess must be between ${rangeStart} and ${rangeEnd}` 
            };
        }
        
        return { valid: true };
    }

    // Get player's game performance for current session
    getSessionPerformance() {
        const gamesPlayed = this.wins + Math.max(0, this.stats.totalGames - this.stats.totalWins);
        const winRate = gamesPlayed > 0 ? (this.wins / gamesPlayed * 100).toFixed(1) : 0;
        
        return {
            gamesPlayed: gamesPlayed,
            wins: this.wins,
            winRate: parseFloat(winRate),
            currentAttempts: this.attempts,
            bestScore: this.stats.bestScore,
            averageAttempts: this.stats.averageAttempts
        };
    }

    // Serialize player for storage/transmission
    toJSON() {
        return {
            id: this.id,
            socketId: this.socketId,
            name: this.name,
            isHost: this.isHost,
            isConnected: this.isConnected,
            isReady: this.isReady,
            secretNumber: this.secretNumber,
            attempts: this.attempts,
            wins: this.wins,
            guessHistory: this.guessHistory,
            lastActivity: this.lastActivity,
            joinedAt: this.joinedAt,
            stats: this.stats
        };
    }

    // Create player from JSON data
    static fromJSON(data) {
        const player = new Player(data.socketId, data.name);
        Object.assign(player, data);
        return player;
    }
}

module.exports = Player;