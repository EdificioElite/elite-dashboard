import fs from 'fs';
import path from 'path';
import { pool } from './db';
import { logger } from './lib/logger';

async function migrate() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    logger.info(`Running migration: ${file}`);
    await pool.query(sql);
    logger.info(`Migration ${file} complete`);
  }

  await pool.end();
  logger.info('All migrations complete');
}

migrate().catch((err) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
