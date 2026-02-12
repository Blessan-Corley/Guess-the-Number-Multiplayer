const MemoryStore = require('../storage/MemoryStore');
const lifecycleMethods = require('./party/lifecycleMethods');
const sessionMethods = require('./party/sessionMethods');
const metricsMethods = require('./party/metricsMethods');
const publicDirectoryMethods = require('./party/publicDirectoryMethods');

class PartyService {
  constructor(store = null) {
    this.store = store || new MemoryStore();
    this.partyLocks = new Map();
    this.stats = {
      totalPartiesCreated: 0,
      totalPlayersJoined: 0,
      gamesCompleted: 0,
    };
  }
}

Object.assign(
  PartyService.prototype,
  lifecycleMethods,
  sessionMethods,
  metricsMethods,
  publicDirectoryMethods
);

module.exports = PartyService;
