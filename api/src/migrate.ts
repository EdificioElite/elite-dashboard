import fs from 'fs';
import path from 'path';
import { pool } from './db';
import { logger } from './lib/logger';

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedResult = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(appliedResult.rows.map((r: any) => r.name));

  for (const file of files) {
    if (applied.has(file)) {
      logger.info(`Skipping already applied migration: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    logger.info(`Running migration: ${file}`);
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [file]);
    logger.info(`Migration ${file} complete`);
  }

  await pool.end();
  logger.info('All migrations complete');
}

migrate().catch((err) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
