const fs = require('fs');
const os = require('os');
const path = require('path');
const { newDb } = require('pg-mem');

describe('Migration runner', () => {
  let migrationRunner;
  const canonicalMigrationsDir = path.join(__dirname, '../../src/lib/database/migrations');

  function createPool() {
    const memoryDb = newDb();
    const pgAdapter = memoryDb.adapters.createPg();
    return {
      memoryDb,
      pool: new pgAdapter.Pool({ connectionString: 'postgres://test' }),
    };
  }

  function createTempMigrations(files) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'numduel-migrations-'));
    Object.entries(files).forEach(([name, sql]) => {
      fs.writeFileSync(path.join(directory, name), sql, 'utf8');
    });
    return directory;
  }

  beforeEach(() => {
    jest.resetModules();
    migrationRunner = require('../../src/lib/database/migrationRunner');
  });

  test('applies pending SQL migrations in version order and records them', async () => {
    const { pool } = createPool();
    const migrationsDir = createTempMigrations({
      '002_second.sql': `
                CREATE TABLE migration_order_second (
                    id INTEGER PRIMARY KEY
                );
            `,
      '001_first.sql': `
                CREATE TABLE migration_order_first (
                    id INTEGER PRIMARY KEY
                );
            `,
    });

    const result = await migrationRunner.runMigrations({
      pool,
      migrationsDir,
      autoApply: true,
      failOnPending: false,
    });

    const appliedRows = await pool.query(
      'SELECT version, name FROM schema_migrations ORDER BY version ASC'
    );
    const firstTable = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'migration_order_first'
        `);
    const secondTable = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'migration_order_second'
        `);

    expect(result.appliedVersions).toEqual(['001', '002']);
    expect(appliedRows.rows).toEqual([
      { version: '001', name: 'first' },
      { version: '002', name: 'second' },
    ]);
    expect(firstTable.rows[0].table_name).toBe('migration_order_first');
    expect(secondTable.rows[0].table_name).toBe('migration_order_second');

    await pool.end();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  test('fails fast when pending migrations exist and auto-apply is disabled', async () => {
    const { pool } = createPool();
    const migrationsDir = createTempMigrations({
      '001_first.sql': `
                CREATE TABLE migration_fail_fast (
                    id INTEGER PRIMARY KEY
                );
            `,
    });

    await expect(
      migrationRunner.runMigrations({
        pool,
        migrationsDir,
        autoApply: false,
        failOnPending: true,
      })
    ).rejects.toMatchObject({
      code: 'PENDING_MIGRATIONS',
    });

    const appliedRows = await pool.query('SELECT COUNT(*)::int AS count FROM schema_migrations');
    expect(appliedRows.rows[0].count).toBe(0);

    await pool.end();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  test('returns without changes when schema is already current', async () => {
    const { pool } = createPool();
    const migrationsDir = createTempMigrations({
      '001_first.sql': `
                CREATE TABLE migration_noop (
                    id INTEGER PRIMARY KEY
                );
            `,
    });

    await migrationRunner.runMigrations({
      pool,
      migrationsDir,
      autoApply: true,
      failOnPending: false,
    });

    const secondRun = await migrationRunner.runMigrations({
      pool,
      migrationsDir,
      autoApply: true,
      failOnPending: false,
    });

    expect(secondRun.appliedVersions).toEqual([]);
    expect(secondRun.pendingVersions).toEqual([]);

    await pool.end();
    fs.rmSync(migrationsDir, { recursive: true, force: true });
  });

  test('applies canonical SQL migrations for the persistence schema', async () => {
    const { pool, memoryDb } = createPool();

    const result = await migrationRunner.runMigrations({
      pool,
      migrationsDir: canonicalMigrationsDir,
      autoApply: true,
      failOnPending: false,
    });

    const tables = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('player_profiles', 'matches', 'match_participants', 'schema_migrations')
            ORDER BY table_name ASC
        `);
    const matchParticipants = memoryDb.public.getTable('match_participants');
    const matches = memoryDb.public.getTable('matches');
    const indexNames = [
      ...matchParticipants.constraintsByName.keys(),
      ...matches.constraintsByName.keys(),
    ].sort();

    expect(result.appliedVersions).toEqual(['001', '002']);
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'match_participants',
      'matches',
      'player_profiles',
      'schema_migrations',
    ]);
    expect(indexNames.filter((name) => name.startsWith('idx_'))).toEqual([
      'idx_match_participants_profile_id',
      'idx_matches_completed_at',
    ]);

    await pool.end();
  });
});
