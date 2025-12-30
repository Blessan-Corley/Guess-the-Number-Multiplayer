const GameStore = require('./GameStore');

class MemoryStore extends GameStore {
    constructor() {
        super();
        this.parties = new Map();
        this.playerToParty = new Map();
        this.socketToPlayer = new Map();
    }

    async saveParty(party) {
        this.parties.set(party.code, party);
    }

    async getParty(code) {
        return this.parties.get(code) || null;
    }

    async deleteParty(code) {
        this.parties.delete(code);
    }

    async hasParty(code) {
        return this.parties.has(code);
    }

    async getAllParties() {
        return Array.from(this.parties.values());
    }

    async getPartyCount() {
        return this.parties.size;
    }

    async mapPlayerToParty(playerId, partyCode) {
        this.playerToParty.set(playerId, partyCode);
    }

    async getPartyCodeForPlayer(playerId) {
        return this.playerToParty.get(playerId) || null;
    }

    async removePlayerMapping(playerId) {
        this.playerToParty.delete(playerId);
    }

    async mapSocketToPlayer(socketId, playerId) {
        this.socketToPlayer.set(socketId, playerId);
    }

    async getPlayerIdForSocket(socketId) {
        return this.socketToPlayer.get(socketId) || null;
    }

    async removeSocketMapping(socketId) {
        this.socketToPlayer.delete(socketId);
    }

    // Helper for memory cleanup
    clear() {
        this.parties.clear();
        this.playerToParty.clear();
        this.socketToPlayer.clear();
    }
}

module.exports = MemoryStore;