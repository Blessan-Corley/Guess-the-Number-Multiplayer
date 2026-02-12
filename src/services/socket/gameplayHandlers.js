const phaseHandlers = require('./gameplay/phaseHandlers');
const guessFlowHandlers = require('./gameplay/guessFlowHandlers');
const progressHandlers = require('./gameplay/progressHandlers');

module.exports = {
  ...phaseHandlers,
  ...guessFlowHandlers,
  ...progressHandlers,
};
