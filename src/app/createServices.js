const Database = require('../lib/database');
const createStore = require('../storage/createStore');
const PartyService = require('../services/PartyService');
const ProfileService = require('../services/ProfileService');
const PersistenceService = require('../services/PersistenceService');
const SocketService = require('../services/SocketService');

async function createServices(options = {}) {
  const logger = options.logger || console;
  const io = options.io;

  const database =
    options.database ||
    new Database({
      logger,
      connectionString: options.databaseUrl,
    });

  const store = options.store || (await createStore());

  await database.connect().catch((error) => {
    logger.warn(
      { error: error.message },
      'Database unavailable, disabling persistent profile storage'
    );
    database.disable();
  });

  const partyService = new PartyService(store);
  const profileService = new ProfileService(database);
  const persistenceService = new PersistenceService(database, logger);
  const socketService = new SocketService(io, partyService, {
    profileService,
    persistenceService,
    logger,
  });

  return {
    store,
    database,
    partyService,
    profileService,
    persistenceService,
    socketService,
  };
}

module.exports = createServices;
