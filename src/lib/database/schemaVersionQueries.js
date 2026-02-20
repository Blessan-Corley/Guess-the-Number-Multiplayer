async function ensureSchemaMigrationsTable(pool) {
  const existing = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
        LIMIT 1
    `);

  if (existing.rows.length > 0) {
    return;
  }

  await pool.query(`
        CREATE TABLE schema_migrations (
            version VARCHAR(32) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL
        );
    `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query(`
        SELECT version, name, applied_at AS "appliedAt"
        FROM schema_migrations
        ORDER BY version ASC
    `);

  return result.rows;
}

async function recordAppliedMigration(client, { version, name }) {
  await client.query(
    `
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ($1, $2, NOW())
        `,
    [version, name]
  );
}

module.exports = {
  ensureSchemaMigrationsTable,
  getAppliedMigrations,
  recordAppliedMigration,
};
