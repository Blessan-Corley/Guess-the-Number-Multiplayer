const Player = require('../Player');

function fromJSON(data, PartyClass) {
  const party = Object.create(PartyClass.prototype);

  party.id = data.id;
  party.code = data.code;
  party.hostId = data.hostId;
  party.createdAt = data.createdAt;
  party.lastActivity = data.lastActivity;
  party.status = data.status;
  party.visibility = data.visibility || 'private';
  party.currentRound = data.currentRound;
  party.maxRounds = data.maxRounds;
  party.gameSettings = data.gameSettings;

  party.gameState = {
    ...data.gameState,
    playersReady: new Set(
      Array.isArray(data.gameState?.playersReady) ? data.gameState.playersReady : []
    ),
  };

  party.stats = data.stats;
  party._stateVersion = data._stateVersion || 0;
  party._lastStateChange = data._lastStateChange || Date.now();

  party.players = new Map();
  if (Array.isArray(data.players)) {
    data.players.forEach((playerData) => {
      const player = Player.fromJSON(playerData);
      party.players.set(player.id, player);
    });
  }

  return party;
}

module.exports = {
  fromJSON,
};
