const { v4: uuidv4 } = require('uuid');
const config = require('../../config/config');
const playerMethods = require('./party/playerMethods');
const gameplayMethods = require('./party/gameplayMethods');
const stateMethods = require('./party/stateMethods');
const { fromJSON } = require('./party/serialization');

class Party {
  constructor(partyCode, hostPlayer) {
    this.id = uuidv4();
    this.code = partyCode;
    this.players = new Map();
    this.hostId = hostPlayer.id;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.status = 'waiting';
    this.visibility = 'private';
    this.currentRound = 1;
    this.maxRounds = 1;

    this.gameSettings = {
      rangeStart: config.DEFAULT_RANGE_START,
      rangeEnd: config.DEFAULT_RANGE_END,
      selectionTimeLimit: config.SELECTION_TIME_LIMIT,
    };

    this.gameState = {
      phase: 'lobby',
      selectionTimer: null,
      roundStartTime: null,
      matchStartedAt: null,
      winnerId: null,
      roundResults: [],
      playersReady: new Set(),
    };

    this.stats = {
      totalRounds: 0,
      gamesCompleted: 0,
      totalGuesses: 0,
      averageRoundDuration: 0,
      roundDurations: [],
    };

    this._stateVersion = 0;
    this._lastStateChange = Date.now();

    hostPlayer.isHost = true;
    this.addPlayer(hostPlayer);
  }
}

Object.assign(Party.prototype, playerMethods, gameplayMethods, stateMethods);

Party.fromJSON = function fromPartyJSON(data) {
  return fromJSON(data, Party);
};

module.exports = Party;
