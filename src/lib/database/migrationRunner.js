const fs = require('fs');
const path = require('path');
const {
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
  recordAppliedMigration,
} = require('./schemaVersionQueries');

function parseMigrationFilename(filename) {
  const match = /^(\d+)_([^.]+)\.sql$/i.exec(filename);
  if (!match) {
    return null;
  }

  return {
    version: match[1],
    name: match[2],
    filename,
  };
}

function loadMigrations(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .map(parseMigrationFilename)
    .filter(Boolean)
    .sort((left, right) => left.version.localeCompare(right.version))
    .map((migration) => ({
      ...migration,
      sql: fs.readFileSync(path.join(migrationsDir, migration.filename), 'utf8'),
    }));
}

function createPendingMigrationsError(pendingVersions) {
  const error = new Error(`Pending database migrations: ${pendingVersions.join(', ')}`);
  error.code = 'PENDING_MIGRATIONS';
  error.pendingVersions = pendingVersions;
  return error;
}

async function runMigrations({
  pool,
  migrationsDir = path.join(__dirname, 'migrations'),
  autoApply = true,
  failOnPending = false,
  logger = null,
}) {
  if (!pool) {
    throw new Error('A database pool is required to run migrations');
  }

  await ensureSchemaMigrationsTable(pool);

  const migrations = loadMigrations(migrationsDir);
  const applied = await getAppliedMigrations(pool);
  const appliedVersions = new Set(applied.map((migration) => migration.version));
  const pending = migrations.filter((migration) => !appliedVersions.has(migration.version));

  if (pending.length > 0 && failOnPending && !autoApply) {
    throw createPendingMigrationsError(pending.map((migration) => migration.version));
  }

  if (!autoApply || pending.length === 0) {
    return {
      appliedVersions: [],
      pendingVersions: pending.map((migration) => migration.version),
    };
  }

  const client = await pool.connect();
  const newlyAppliedVersions = [];

  try {
    for (const migration of pending) {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await recordAppliedMigration(client, migration);
      await client.query('COMMIT');
      newlyAppliedVersions.push(migration.version);
      if (logger && typeof logger.info === 'function') {
        logger.info(
          { version: migration.version, name: migration.name },
          'Applied database migration'
        );
      }
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    appliedVersions: newlyAppliedVersions,
    pendingVersions: [],
  };
}

module.exports = {
  loadMigrations,
  parseMigrationFilename,
  runMigrations,
};
