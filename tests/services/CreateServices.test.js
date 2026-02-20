const createServices = require('../../src/app/createServices');
const MemoryStore = require('../../src/storage/MemoryStore');
const Database = require('../../src/lib/database');

describe('createServices', () => {
  test('reuses provided dependencies and returns the service graph', async () => {
    const store = new MemoryStore();
    const database = new Database({ connectionString: '' });
    database.disable();
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const services = await createServices({ store, database, logger });

    expect(services.store).toBe(store);
    expect(services.database).toBe(database);
    expect(services.partyService).toBeDefined();
    expect(services.profileService).toBeDefined();
    expect(services.persistenceService).toBeDefined();
    expect(services.socketService).toBeDefined();

    services.socketService.cleanup();
  });
});
