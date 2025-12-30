const GameStore = require('./GameStore');
const Party = require('../models/Party');

class RedisStore extends GameStore {
    constructor(redisClient) {
        super();
        this.client = redisClient;
        this.PREFIX = 'game:';
        this.TTL = 3600; // 1 hour expiration for keys
    }

    async saveParty(party) {
        const key = `${this.PREFIX}party:${party.code}`;
        const data = JSON.stringify(party.toJSON());
        await this.client.set(key, data, { EX: this.TTL });
    }

    async getParty(code) {
        const key = `${this.PREFIX}party:${code}`;
        const data = await this.client.get(key);
        if (!data) return null;
        
        try {
            const json = JSON.parse(data);
            return Party.fromJSON(json);
        } catch (e) {
            console.error('Failed to parse party from redis:', e);
            return null;
        }
    }

    async deleteParty(code) {
        const key = `${this.PREFIX}party:${code}`;
        await this.client.del(key);
    }

    async hasParty(code) {
        const key = `${this.PREFIX}party:${code}`;
        return (await this.client.exists(key)) === 1;
    }

    async getAllParties() {
        const keys = await this.client.keys(`${this.PREFIX}party:*`);
        const parties = [];
        
        for (const key of keys) {
            const data = await this.client.get(key);
            if (data) {
                try {
                    parties.push(Party.fromJSON(JSON.parse(data)));
                } catch (e) {}
            }
        }
        return parties;
    }

    async getPartyCount() {
        const keys = await this.client.keys(`${this.PREFIX}party:*`);
        return keys.length;
    }

    async mapPlayerToParty(playerId, partyCode) {
        const key = `${this.PREFIX}player:${playerId}`;
        await this.client.set(key, partyCode, { EX: this.TTL });
    }

    async getPartyCodeForPlayer(playerId) {
        const key = `${this.PREFIX}player:${playerId}`;
        return await this.client.get(key);
    }

    async removePlayerMapping(playerId) {
        const key = `${this.PREFIX}player:${playerId}`;
        await this.client.del(key);
    }

    async mapSocketToPlayer(socketId, playerId) {
        const key = `${this.PREFIX}socket:${socketId}`;
        await this.client.set(key, playerId, { EX: this.TTL });
    }

    async getPlayerIdForSocket(socketId) {
        const key = `${this.PREFIX}socket:${socketId}`;
        return await this.client.get(key);
    }

    async removeSocketMapping(socketId) {
        const key = `${this.PREFIX}socket:${socketId}`;
        await this.client.del(key);
    }
}

module.exports = RedisStore;