import { Pool, types } from 'pg';
import { config } from './config';

types.setTypeParser(1700, parseFloat);

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
