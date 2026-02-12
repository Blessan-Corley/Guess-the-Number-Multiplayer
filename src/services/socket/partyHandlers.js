const partyLifecycleHandlers = require('./party/partyLifecycleHandlers');
const gameControlHandlers = require('./party/gameControlHandlers');
const connectionHandlers = require('./party/connectionHandlers');

module.exports = {
  ...partyLifecycleHandlers,
  ...gameControlHandlers,
  ...connectionHandlers,
};
