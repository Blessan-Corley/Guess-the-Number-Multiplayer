const Party = require('../models/Party');
const Player = require('../models/Player');
const config = require('../../config/config');

class PartyService {
    constructor() {
        this.parties = new Map(); // partyCode -> Party
        this.playerToParty = new Map(); // playerId -> partyCode
        this.socketToPlayer = new Map(); // socketId -> playerId
        this.stats = {
            totalPartiesCreated: 0,
            totalPlayersJoined: 0,
            gamesCompleted: 0
        };
    }

    // Generate unique party code
    generatePartyCode() {
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            code = '';
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            for (let i = 0; i < config.PARTY_CODE_LENGTH; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            attempts++;
        } while (this.parties.has(code) && attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            throw new Error('Unable to generate unique party code');
        }

        return code;
    }

    // Create a new party
    createParty(hostSocketId, hostName) {
        if (!hostName || typeof hostName !== 'string') {
            throw new Error('Invalid host name');
        }

        // FIXED: Clean up any existing mappings for this socket
        // This ensures proper host status regardless of previous party membership
        const existingPlayerId = this.socketToPlayer.get(hostSocketId);
        if (existingPlayerId) {
            const existingPartyCode = this.playerToParty.get(existingPlayerId);
            if (existingPartyCode) {
                // Remove from previous party if it exists
                const existingParty = this.parties.get(existingPartyCode);
                if (existingParty) {
                    existingParty.removePlayer(existingPlayerId);
                    if (existingParty.isEmpty()) {
                        this.parties.delete(existingPartyCode);
                    }
                }
            }
            // Clean up old mappings
            this.playerToParty.delete(existingPlayerId);
            this.socketToPlayer.delete(hostSocketId);
        }

        const partyCode = this.generatePartyCode();
        const hostPlayer = new Player(hostSocketId, hostName);
        const party = new Party(partyCode, hostPlayer);

        this.parties.set(partyCode, party);
        this.playerToParty.set(hostPlayer.id, partyCode);
        this.socketToPlayer.set(hostSocketId, hostPlayer.id);
        this.stats.totalPartiesCreated++;
        this.stats.totalPlayersJoined++;

        console.log(`Party created: ${partyCode} by ${hostName} (${hostSocketId}) - ALWAYS HOST`);
        return party;
    }

    // Join an existing party
    joinParty(partyCode, playerSocketId, playerName) {
        if (!partyCode || !playerName) {
            throw new Error('Party code and player name are required');
        }

        const party = this.parties.get(partyCode.toUpperCase());
        if (!party) {
            throw new Error('Party not found');
        }

        if (party.isFull()) {
            throw new Error('Party is full');
        }

        // FIXED: Clean up any existing mappings for this socket
        const existingPlayerId = this.socketToPlayer.get(playerSocketId);
        if (existingPlayerId) {
            const existingPartyCode = this.playerToParty.get(existingPlayerId);
            if (existingPartyCode && existingPartyCode !== partyCode.toUpperCase()) {
                // Remove from previous party
                const existingParty = this.parties.get(existingPartyCode);
                if (existingParty) {
                    existingParty.removePlayer(existingPlayerId);
                    if (existingParty.isEmpty()) {
                        this.parties.delete(existingPartyCode);
                    }
                }
                // Clean up old mappings
                this.playerToParty.delete(existingPlayerId);
                this.socketToPlayer.delete(playerSocketId);
            }
        }

        const player = new Player(playerSocketId, playerName);
        party.addPlayer(player);

        this.playerToParty.set(player.id, partyCode.toUpperCase());
        this.socketToPlayer.set(playerSocketId, player.id);
        this.stats.totalPlayersJoined++;

        console.log(`Player joined: ${playerName} (${playerSocketId}) -> Party ${partyCode}`);
        return { party, player };
    }

    // Leave a party
    leaveParty(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) {
            return null;
        }

        const partyCode = this.playerToParty.get(playerId);
        if (!partyCode) {
            return null;
        }

        const party = this.parties.get(partyCode);
        if (!party) {
            return null;
        }

        const player = party.getPlayer(playerId);
        const wasHost = player.isHost;
        const removeResult = party.removePlayer(playerId);

        // Clean up mappings
        this.playerToParty.delete(playerId);
        this.socketToPlayer.delete(socketId);

        // FIXED: If host left or party is empty, remove party completely
        if (removeResult === 'HOST_LEFT' || party.isEmpty()) {
            this.parties.delete(partyCode);
            console.log(`Party deleted: ${partyCode} (${removeResult === 'HOST_LEFT' ? 'host left' : 'empty'})`);
        }

        console.log(`Player left: ${player?.name || 'Unknown'} (${socketId}) from Party ${partyCode}`);
        return { party, player, partyCode, wasHost };
    }

    // Get party by code
    getParty(partyCode) {
        if (!partyCode) return null;
        return this.parties.get(partyCode.toUpperCase());
    }

    // Get party by socket ID
    getPartyBySocket(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) return null;

        const partyCode = this.playerToParty.get(playerId);
        if (!partyCode) return null;

        return this.parties.get(partyCode);
    }

    // Get player by socket ID
    getPlayerBySocket(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) return null;

        const partyCode = this.playerToParty.get(playerId);
        if (!partyCode) return null;

        const party = this.parties.get(partyCode);
        if (!party) return null;

        return party.getPlayer(playerId);
    }

    // Handle player reconnection
    reconnectPlayer(socketId, partyCode, playerId) {
        const party = this.getParty(partyCode);
        if (!party) {
            return { success: false, error: 'Party not found' };
        }

        const player = party.getPlayer(playerId);
        if (!player) {
            return { success: false, error: 'Player not found in party' };
        }

        // Update mappings
        const oldSocketId = player.socketId;
        this.socketToPlayer.delete(oldSocketId);
        this.socketToPlayer.set(socketId, playerId);

        // Update player
        player.updateSocketId(socketId);

        console.log(`Player reconnected: ${player.name} (${oldSocketId} -> ${socketId})`);
        return { success: true, party, player };
    }

    // Clean up inactive parties
    cleanupInactiveParties() {
        let cleanedCount = 0;
        const now = Date.now();

        for (const [partyCode, party] of this.parties.entries()) {
            if (party.isInactive() || party.isEmpty()) {
                // Clean up all players in the party
                party.players.forEach(player => {
                    this.playerToParty.delete(player.id);
                    this.socketToPlayer.delete(player.socketId);
                });

                this.parties.delete(partyCode);
                cleanedCount++;
                console.log(`Cleaned up inactive party: ${partyCode}`);
            }
        }

        return cleanedCount;
    }

    // Clean up disconnected players
    cleanupDisconnectedPlayer(socketId) {
        const playerId = this.socketToPlayer.get(socketId);
        if (!playerId) return null;

        const partyCode = this.playerToParty.get(playerId);
        if (!partyCode) return null;

        const party = this.parties.get(partyCode);
        if (!party) return null;

        const player = party.getPlayer(playerId);
        if (player) {
            player.setConnected(false);
            
            // If player is disconnected for too long, remove them
            setTimeout(() => {
                const currentPlayer = party.getPlayer(playerId);
                if (currentPlayer && !currentPlayer.isConnected) {
                    this.leaveParty(socketId);
                }
            }, 60000); // 1 minute grace period
        }

        return { party, player, partyCode };
    }

    // Get all active parties
    getActiveParties() {
        return Array.from(this.parties.values()).filter(party => !party.isEmpty());
    }

    // Get party statistics
    getStats() {
        const activeParties = this.getActiveParties();
        const activePlayers = activeParties.reduce((total, party) => total + party.players.size, 0);
        
        return {
            totalPartiesCreated: this.stats.totalPartiesCreated,
            activeParties: activeParties.length,
            totalPlayersJoined: this.stats.totalPlayersJoined,
            activePlayers: activePlayers,
            gamesCompleted: this.stats.gamesCompleted
        };
    }

    // Get active parties count
    getActivePartiesCount() {
        return this.getActiveParties().length;
    }

    // Get active players count
    getActivePlayersCount() {
        return this.getActiveParties().reduce((total, party) => total + party.players.size, 0);
    }

    // Get total parties created
    getTotalPartiesCreated() {
        return this.stats.totalPartiesCreated;
    }

    // Get total players count
    getTotalPlayersCount() {
        return this.stats.totalPlayersJoined;
    }

    // Get games completed count
    getGamesCompletedCount() {
        return this.stats.gamesCompleted;
    }

    // Record game completion
    recordGameCompletion() {
        this.stats.gamesCompleted++;
    }

    // Validate party code format
    validatePartyCode(code) {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: 'Party code must be a string' };
        }

        if (code.length !== config.PARTY_CODE_LENGTH) {
            return { valid: false, error: `Party code must be ${config.PARTY_CODE_LENGTH} characters long` };
        }

        if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
            return { valid: false, error: 'Party code can only contain letters and numbers' };
        }

        return { valid: true };
    }

    // Validate player name
    validatePlayerName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, error: 'Player name must be a string' };
        }

        const trimmedName = name.trim();
        if (trimmedName.length === 0) {
            return { valid: false, error: 'Player name cannot be empty' };
        }

        if (trimmedName.length > 20) {
            return { valid: false, error: 'Player name cannot be longer than 20 characters' };
        }

        if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
            return { valid: false, error: 'Player name can only contain letters, numbers, and spaces' };
        }

        return { valid: true, name: trimmedName };
    }

    // Get detailed party info for debugging
    getPartyDetails(partyCode) {
        const party = this.getParty(partyCode);
        if (!party) return null;

        return {
            code: party.code,
            id: party.id,
            status: party.status,
            phase: party.gameState.phase,
            round: party.currentRound,
            maxRounds: party.maxRounds,
            players: Array.from(party.players.values()).map(player => ({
                id: player.id,
                name: player.name,
                socketId: player.socketId,
                isHost: player.isHost,
                isConnected: player.isConnected,
                isReady: player.isReady,
                attempts: player.attempts,
                wins: player.wins
            })),
            settings: party.gameSettings,
            createdAt: party.createdAt,
            lastActivity: party.lastActivity,
            isInactive: party.isInactive()
        };
    }

    // Broadcast to all players in a party
    broadcastToParty(partyCode, event, data, io) {
        const party = this.getParty(partyCode);
        if (!party) return false;

        party.players.forEach(player => {
            if (player.isConnected) {
                io.to(player.socketId).emit(event, data);
            }
        });

        return true;
    }

    // Broadcast to specific player in party
    sendToPlayer(playerId, event, data, io) {
        const partyCode = this.playerToParty.get(playerId);
        if (!partyCode) return false;

        const party = this.getParty(partyCode);
        if (!party) return false;

        const player = party.getPlayer(playerId);
        if (!player || !player.isConnected) return false;

        io.to(player.socketId).emit(event, data);
        return true;
    }

    // Check if socket is in any party
    isSocketInParty(socketId) {
        return this.socketToPlayer.has(socketId);
    }

    // Get all parties for admin/monitoring
    getAllParties() {
        return Array.from(this.parties.entries()).map(([code, party]) => ({
            code,
            ...party.getPublicInfo()
        }));
    }

    // Emergency cleanup - remove all parties and players
    emergencyCleanup() {
        const partyCount = this.parties.size;
        const playerCount = this.playerToParty.size;

        this.parties.clear();
        this.playerToParty.clear();
        this.socketToPlayer.clear();

        console.log(`Emergency cleanup completed: ${partyCount} parties, ${playerCount} players removed`);
        return { partiesRemoved: partyCount, playersRemoved: playerCount };
    }

    // Get system health info
    getSystemHealth() {
        const activeParties = this.getActiveParties();
        const memoryUsage = process.memoryUsage();
        
        return {
            healthy: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            parties: {
                total: this.parties.size,
                active: activeParties.length,
                inactive: this.parties.size - activeParties.length
            },
            players: {
                total: this.socketToPlayer.size,
                active: this.getActivePlayersCount()
            },
            memory: {
                rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
            },
            stats: this.stats
        };
    }
}

module.exports = PartyService;