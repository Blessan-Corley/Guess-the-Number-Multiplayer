const PartyService = require('../../src/services/PartyService');
const config = require('../../config/config');

describe('PartyService', () => {
    let partyService;
    let hostSocketId = 'socket_host_123';
    let hostName = 'HostPlayer';

    beforeEach(() => {
        partyService = new PartyService();
    });

    test('Should create a party with unique code', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        expect(party).toBeDefined();
        expect(party.code).toHaveLength(config.PARTY_CODE_LENGTH);
        expect(party.players.size).toBe(1);
        expect(await partyService.getParty(party.code)).toBe(party);
    });

    test('Should allow second player to join', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        const joinResult = await partyService.joinParty(party.code, 'socket_p2_456', 'Player2');
        
        expect(joinResult.party).toBe(party);
        expect(party.players.size).toBe(2);
    });

    test('Should prevent joining full party', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        await partyService.joinParty(party.code, 'socket_p2_456', 'Player2');
        
        await expect(partyService.joinParty(party.code, 'socket_p3_789', 'Player3'))
            .rejects.toThrow('Party is full');
    });

    test('Should handle player leaving', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        const p2Socket = 'socket_p2_456';
        await partyService.joinParty(party.code, p2Socket, 'Player2');
        
        const result = await partyService.leaveParty(p2Socket);
        expect(result.partyCode).toBe(party.code);
        expect(party.players.size).toBe(1);
    });

    test('Should close party when host leaves', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        await partyService.joinParty(party.code, 'socket_p2_456', 'Player2');
        
        const result = await partyService.leaveParty(hostSocketId);
        expect(result.wasHost).toBe(true);
        expect(await partyService.getParty(party.code)).toBeNull();
    });

    test('Should clean up inactive parties', async () => {
        const party = await partyService.createParty(hostSocketId, hostName);
        
        // Mock inactivity
        party.lastActivity = Date.now() - (config.INACTIVITY_TIMEOUT + 1000);
        
        const cleanedCount = await partyService.cleanupInactiveParties();
        expect(cleanedCount).toBe(1);
        expect(await partyService.getParty(party.code)).toBeNull();
    });
});
