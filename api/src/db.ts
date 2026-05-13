import { Pool, types } from 'pg';
import { config } from './config';
import { logger } from './lib/logger';

types.setTypeParser(1700, parseFloat);

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  logger.error(err, 'Unexpected error on idle client');
  process.exit(-1);
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
