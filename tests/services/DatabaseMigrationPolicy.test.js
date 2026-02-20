const fs = require('fs');
const os = require('os');
const path = require('path');
const { newDb } = require('pg-mem');
const Database = require('../../src/lib/database');

describe('Database migration policy', () => {
  function createTempMigrations(files) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'numduel-db-migrations-'));
    Object.entries(files).forEach(([name, sql]) => {
      fs.writeFileSync(path.join(directory, name), sql, 'utf8');
    });
    return directory;
  }

  function createPoolFactory() {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();
    return {
      memoryDb,
      poolFactory: (poolConfig) => new pgAdapter.Pool(poolConfig),
    };
  }

  test('connect auto-applies pending migrations when enabled', async () => {
    const migrationsDir = createTempMigrations({
      '001_create_table.sql': `
                CREATE TABLE policy_auto_apply (
                    id INTEGER PRIMARY KEY
                );
            `,
    });
    const { poolFactory } = createPoolFactory();
    const database = new Database({
      connectionString: 'postgres://test',
      poolFactory,
      migrationsDir,
      autoMigrate: true,
      failOnPendingMigrations: false,
    });

    await database.connect();
    const result = await database.pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'policy_auto_apply'
        `);

    expect(result.rows[0].table_name).toBe('policy_auto_apply');

    await database.close();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  test('connect fails fast when pending migrations exist and auto-apply is disabled', async () => {
    const migrationsDir = createTempMigrations({
      '001_create_table.sql': `
                CREATE TABLE policy_fail_fast (
                    id INTEGER PRIMARY KEY
                );
            `,
    });
    const { poolFactory } = createPoolFactory();
    const database = new Database({
      connectionString: 'postgres://test',
      poolFactory,
      migrationsDir,
      autoMigrate: false,
      failOnPendingMigrations: true,
    });

    await expect(database.connect()).rejects.toMatchObject({
      code: 'PENDING_MIGRATIONS',
    });

    await database.close();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });
});
