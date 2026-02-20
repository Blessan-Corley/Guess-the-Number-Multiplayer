const pino = require('pino');
const config = require('../../config/config');

const logger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: 'multiplayer-number-guesser',
    env: config.NODE_ENV,
    version: config.APP_VERSION,
    commit: config.COMMIT_SHA,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'databaseUrl', 'token', 'password'],
    remove: true,
  },
});

module.exports = logger;
