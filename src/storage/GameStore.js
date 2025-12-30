/**
 * Interface for Game Storage
 * All storage implementations must adhere to this interface
 */
class GameStore {
    constructor() {}

    /**
     * Save a party
     * @param {Party} party 
     * @returns {Promise<void>}
     */
    async saveParty(party) {
        throw new Error('Method not implemented');
    }

    /**
     * Get a party by code
     * @param {string} code 
     * @returns {Promise<Party|null>}
     */
    async getParty(code) {
        throw new Error('Method not implemented');
    }

    /**
     * Delete a party
     * @param {string} code 
     * @returns {Promise<void>}
     */
    async deleteParty(code) {
        throw new Error('Method not implemented');
    }

    /**
     * Check if a party exists
     * @param {string} code 
     * @returns {Promise<boolean>}
     */
    async hasParty(code) {
        throw new Error('Method not implemented');
    }

    /**
     * Get all active parties
     * @returns {Promise<Party[]>}
     */
    async getAllParties() {
        throw new Error('Method not implemented');
    }

    /**
     * Get party count
     * @returns {Promise<number>}
     */
    async getPartyCount() {
        throw new Error('Method not implemented');
    }

    /**
     * Map player ID to party code
     * @param {string} playerId 
     * @param {string} partyCode 
     */
    async mapPlayerToParty(playerId, partyCode) {
        throw new Error('Method not implemented');
    }

    /**
     * Get party code for a player
     * @param {string} playerId 
     * @returns {Promise<string|null>}
     */
    async getPartyCodeForPlayer(playerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Remove player to party mapping
     * @param {string} playerId 
     */
    async removePlayerMapping(playerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Map socket ID to player ID
     * @param {string} socketId 
     * @param {string} playerId 
     */
    async mapSocketToPlayer(socketId, playerId) {
        throw new Error('Method not implemented');
    }

    /**
     * Get player ID for a socket
     * @param {string} socketId 
     * @returns {Promise<string|null>}
     */
    async getPlayerIdForSocket(socketId) {
        throw new Error('Method not implemented');
    }

    /**
     * Remove socket to player mapping
     * @param {string} socketId 
     */
    async removeSocketMapping(socketId) {
        throw new Error('Method not implemented');
    }
}

module.exports = GameStore;