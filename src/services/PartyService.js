const Party = require('../models/Party');
const Player = require('../models/Player');
const config = require('../../config/config');
const MemoryStore = require('../storage/MemoryStore');

class PartyService {
    constructor(store = null) {
        this.store = store || new MemoryStore();
        this.stats = {
            totalPartiesCreated: 0,
            totalPlayersJoined: 0,
            gamesCompleted: 0
        };
    }

    
    async generatePartyCode() {
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
            
            // Async check
            const exists = await this.store.hasParty(code);
            if (!exists) return code;
            
        } while (attempts < maxAttempts);

        throw new Error('Unable to generate unique party code');
    }

    
    async createParty(hostSocketId, hostName) {
        if (!hostName || typeof hostName !== 'string') {
            throw new Error('Invalid host name');
        }

        
        
        const existingPlayerId = await this.store.getPlayerIdForSocket(hostSocketId);
        if (existingPlayerId) {
            const existingPartyCode = await this.store.getPartyCodeForPlayer(existingPlayerId);
            if (existingPartyCode) {
                
                const existingParty = await this.store.getParty(existingPartyCode);
                if (existingParty) {
                    existingParty.removePlayer(existingPlayerId);
                    if (existingParty.isEmpty()) {
                        await this.store.deleteParty(existingPartyCode);
                    } else {
                        await this.store.saveParty(existingParty);
                    }
                }
            }
            
            await this.store.removePlayerMapping(existingPlayerId);
            await this.store.removeSocketMapping(hostSocketId);
        }

        const partyCode = await this.generatePartyCode();
        const hostPlayer = new Player(hostSocketId, hostName);
        const party = new Party(partyCode, hostPlayer);

        await this.store.saveParty(party);
        await this.store.mapPlayerToParty(hostPlayer.id, partyCode);
        await this.store.mapSocketToPlayer(hostSocketId, hostPlayer.id);
        
        this.stats.totalPartiesCreated++;
        this.stats.totalPlayersJoined++;

        return party;
    }

    
    async joinParty(partyCode, playerSocketId, playerName) {
        if (!partyCode || !playerName) {
            throw new Error('Party code and player name are required');
        }

        const party = await this.store.getParty(partyCode.toUpperCase());
        if (!party) {
            throw new Error('Party not found');
        }

        if (party.isFull()) {
            throw new Error('Party is full');
        }

        
        const existingPlayerId = await this.store.getPlayerIdForSocket(playerSocketId);
        if (existingPlayerId) {
            const existingPartyCode = await this.store.getPartyCodeForPlayer(existingPlayerId);
            if (existingPartyCode && existingPartyCode !== partyCode.toUpperCase()) {
                
                const existingParty = await this.store.getParty(existingPartyCode);
                if (existingParty) {
                    existingParty.removePlayer(existingPlayerId);
                    if (existingParty.isEmpty()) {
                        await this.store.deleteParty(existingPartyCode);
                    } else {
                        await this.store.saveParty(existingParty);
                    }
                }
                
                await this.store.removePlayerMapping(existingPlayerId);
                await this.store.removeSocketMapping(playerSocketId);
            }
        }

        const player = new Player(playerSocketId, playerName);
        party.addPlayer(player);

        await this.store.saveParty(party);
        await this.store.mapPlayerToParty(player.id, partyCode.toUpperCase());
        await this.store.mapSocketToPlayer(playerSocketId, player.id);
        
        this.stats.totalPlayersJoined++;

        return { party, player };
    }

    
    async leaveParty(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        if (!playerId) {
            return null;
        }

        const partyCode = await this.store.getPartyCodeForPlayer(playerId);
        if (!partyCode) {
            return null;
        }

        const party = await this.store.getParty(partyCode);
        if (!party) {
            return null;
        }

        const player = party.getPlayer(playerId);
        if (!player) return null; // Logic safety
        
        const wasHost = player.isHost;
        const removeResult = party.removePlayer(playerId);

        
        await this.store.removePlayerMapping(playerId);
        await this.store.removeSocketMapping(socketId);

        
        if (removeResult === 'HOST_LEFT' || party.isEmpty()) {
            await this.store.deleteParty(partyCode);
        } else {
            await this.store.saveParty(party);
        }

        return { party, player, partyCode, wasHost };
    }

    
    async getParty(partyCode) {
        if (!partyCode) return null;
        return await this.store.getParty(partyCode.toUpperCase());
    }

    
    async getPartyBySocket(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        if (!playerId) return null;

        const partyCode = await this.store.getPartyCodeForPlayer(playerId);
        if (!partyCode) return null;

        return await this.store.getParty(partyCode);
    }

    
    async getPlayerBySocket(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        if (!playerId) return null;

        const partyCode = await this.store.getPartyCodeForPlayer(playerId);
        if (!partyCode) return null;

        const party = await this.store.getParty(partyCode);
        if (!party) return null;

        return party.getPlayer(playerId);
    }

    async isSocketInParty(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        return !!playerId;
    }

    
    async reconnectPlayer(socketId, partyCode, playerId) {
        const party = await this.store.getParty(partyCode);
        if (!party) {
            return { success: false, error: 'Party not found' };
        }

        const player = party.getPlayer(playerId);
        if (!player) {
            return { success: false, error: 'Player not found in party' };
        }

        
        const oldSocketId = player.socketId;
        await this.store.removeSocketMapping(oldSocketId);
        await this.store.mapSocketToPlayer(socketId, playerId);

        
        player.updateSocketId(socketId);
        await this.store.saveParty(party);

        return { success: true, party, player };
    }

    
    async cleanupInactiveParties() {
        let cleanedCount = 0;
        const allParties = await this.store.getAllParties();

        for (const party of allParties) {
            if (party.isInactive() || party.isEmpty()) {
                
                for (const player of party.players.values()) {
                    await this.store.removePlayerMapping(player.id);
                    await this.store.removeSocketMapping(player.socketId);
                }

                await this.store.deleteParty(party.code);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    
    async cleanupDisconnectedPlayer(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        if (!playerId) return null;

        const partyCode = await this.store.getPartyCodeForPlayer(playerId);
        if (!partyCode) return null;

        const party = await this.store.getParty(partyCode);
        if (!party) return null;

        const player = party.getPlayer(playerId);
        if (player) {
            player.setConnected(false);
            await this.store.saveParty(party);
            
            
            setTimeout(async () => {
                // Fetch fresh state
                const currentParty = await this.getParty(partyCode);
                if (currentParty) {
                    const currentPlayer = currentParty.getPlayer(playerId);
                    if (currentPlayer && !currentPlayer.isConnected) {
                        await this.leaveParty(socketId);
                    }
                }
            }, 60000); 
        }

        return { party, player, partyCode };
    }

    
    async getActiveParties() {
        const parties = await this.store.getAllParties();
        return parties.filter(party => !party.isEmpty());
    }

    
    async getStats() {
        const activeParties = await this.getActiveParties();
        const activePlayers = activeParties.reduce((total, party) => total + party.players.size, 0);
        
        return {
            totalPartiesCreated: this.stats.totalPartiesCreated,
            activeParties: activeParties.length,
            totalPlayersJoined: this.stats.totalPlayersJoined,
            activePlayers: activePlayers,
            gamesCompleted: this.stats.gamesCompleted
        };
    }

    
    async getActivePartiesCount() {
        const parties = await this.getActiveParties();
        return parties.length;
    }

    
    async getActivePlayersCount() {
        const parties = await this.getActiveParties();
        return parties.reduce((total, party) => total + party.players.size, 0);
    }

    
    getTotalPartiesCreated() {
        return this.stats.totalPartiesCreated;
    }

    
    getTotalPlayersCount() {
        return this.stats.totalPlayersJoined;
    }

    
    getGamesCompletedCount() {
        return this.stats.gamesCompleted;
    }

    
    recordGameCompletion() {
        this.stats.gamesCompleted++;
    }

    // saveParty helper for external services
    async saveParty(party) {
        await this.store.saveParty(party);
    }


    
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

    
    async getPartyDetails(partyCode) {
        const party = await this.getParty(partyCode);
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

    
    async broadcastToParty(partyCode, event, data, io) {
        const party = await this.getParty(partyCode);
        if (!party) return false;

        party.players.forEach(player => {
            if (player.isConnected) {
                io.to(player.socketId).emit(event, data);
            }
        });

        return true;
    }

    
    async sendToPlayer(playerId, event, data, io) {
        const partyCode = await this.store.getPartyCodeForPlayer(playerId);
        if (!partyCode) return false;

        const party = await this.getParty(partyCode);
        if (!party) return false;

        const player = party.getPlayer(playerId);
        if (!player || !player.isConnected) return false;

        io.to(player.socketId).emit(event, data);
        return true;
    }

    
    async isSocketInParty(socketId) {
        const playerId = await this.store.getPlayerIdForSocket(socketId);
        return !!playerId;
    }

    
    async getAllParties() {
        const parties = await this.store.getAllParties();
        return parties.map(party => ({
            code: party.code,
            ...party.getPublicInfo()
        }));
    }

    
    async emergencyCleanup() {
        // Not supported in generic store interface yet
        return { partiesRemoved: 0, playersRemoved: 0 };
    }

    
    async getSystemHealth() {
        const activeParties = await this.getActiveParties();
        const memoryUsage = process.memoryUsage();
        const totalParties = await this.store.getPartyCount();
        
        return {
            healthy: true,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            parties: {
                total: totalParties,
                active: activeParties.length,
                inactive: totalParties - activeParties.length
            },
            players: {
                total: 0, // Difficult to count effectively in generic store without scan
                active: await this.getActivePlayersCount()
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