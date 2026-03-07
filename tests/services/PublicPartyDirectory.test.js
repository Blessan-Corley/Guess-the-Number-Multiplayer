const PartyService = require('../../src/services/PartyService');
const MemoryStore = require('../../src/storage/MemoryStore');
const Party = require('../../src/models/Party');

class SnapshotStore extends MemoryStore {
  async saveParty(party) {
    const snapshot = Party.fromJSON(JSON.parse(JSON.stringify(party.toJSON())));
    await new Promise((resolve) => setTimeout(resolve, 5));
    this.parties.set(party.code, snapshot);
  }

  async getParty(code) {
    const party = this.parties.get(code);
    if (!party) {
      return null;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
    return Party.fromJSON(JSON.parse(JSON.stringify(party.toJSON())));
  }
}

describe('Public party directory', () => {
  test('creates parties as private by default and excludes them from public listing', async () => {
    const partyService = new PartyService();
    const party = await partyService.createParty('host-socket', 'HostPlayer');

    expect(party.visibility).toBe('private');

    const publicParties = await partyService.listPublicParties();
    expect(publicParties).toEqual([]);
  });

  test('allows the host to make a lobby party public and includes it in public listing', async () => {
    const partyService = new PartyService();
    const party = await partyService.createParty('host-socket', 'HostPlayer');

    const updatedParty = await partyService.updatePartyVisibility('host-socket', 'public');
    const publicParties = await partyService.listPublicParties();

    expect(updatedParty.visibility).toBe('public');
    expect(publicParties).toHaveLength(1);
    expect(publicParties[0]).toMatchObject({
      code: party.code,
      hostName: 'HostPlayer',
      playerCount: 1,
      maxPlayers: 2,
      visibility: 'public',
      joinStatus: 'open',
    });
  });

  test('rejects visibility changes after the match has started', async () => {
    const partyService = new PartyService();
    const party = await partyService.createParty('host-socket', 'HostPlayer');
    party.gameState.phase = 'playing';
    await partyService.saveParty(party);

    await expect(partyService.updatePartyVisibility('host-socket', 'public')).rejects.toThrow(
      'Room visibility can only be changed in the lobby'
    );
  });

  test('shows public lobby rooms as filled when the second player has joined', async () => {
    const partyService = new PartyService();
    const party = await partyService.createParty('host-socket', 'HostPlayer');
    await partyService.updatePartyVisibility('host-socket', 'public');
    await partyService.joinParty(party.code, 'guest-socket', 'GuestPlayer');

    const publicParties = await partyService.listPublicParties();

    expect(publicParties).toHaveLength(1);
    expect(publicParties[0]).toMatchObject({
      code: party.code,
      playerCount: 2,
      joinStatus: 'filled',
    });
  });

  test('admits only one guest when two public joins race for the final slot', async () => {
    const partyService = new PartyService(new SnapshotStore());
    const party = await partyService.createParty('host-socket', 'HostPlayer');
    await partyService.updatePartyVisibility('host-socket', 'public');

    const [firstJoin, secondJoin] = await Promise.allSettled([
      partyService.joinPublicParty(party.code, 'guest-one', 'GuestOne'),
      partyService.joinPublicParty(party.code, 'guest-two', 'GuestTwo'),
    ]);

    const successfulJoins = [firstJoin, secondJoin].filter(
      (result) => result.status === 'fulfilled'
    );
    const failedJoins = [firstJoin, secondJoin].filter((result) => result.status === 'rejected');
    const updatedParty = await partyService.getParty(party.code);

    expect(successfulJoins).toHaveLength(1);
    expect(failedJoins).toHaveLength(1);
    expect(failedJoins[0].reason.message).toBe('Party is full');
    expect(updatedParty.players.size).toBe(2);
  });
});
