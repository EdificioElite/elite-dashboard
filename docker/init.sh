#!/bin/sh
set -e

echo "Installing pg and bcrypt..."
test -f package.json || npm init -y > /dev/null
npm install pg bcrypt > /dev/null 2>&1

echo "Running n8n tables schema..."
node -e "
  const { Pool } = require('pg');
  const fs = require('fs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query(fs.readFileSync('/app/init/01-n8n-tables.sql', 'utf-8'))
    .then(() => pool.query('SELECT COUNT(*) FROM vecinos'))
    .then(res => {
      if (parseInt(res.rows[0].count) > 0) {
        console.log('Seed data already exists, skipping');
        return pool.end();
      }
      console.log('Inserting seed data...');
      return pool.query(fs.readFileSync('/app/init/02-seed.sql', 'utf-8'))
        .then(() => { console.log('Seed data inserted'); return pool.end(); });
    })
    .catch(e => { console.error(e); process.exit(1); });
"

echo "Running usuarios migration..."
node -e "
  const { Pool } = require('pg');
  const fs = require('fs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const files = fs.readdirSync('/app/migrations').filter(f => f.endsWith('.sql')).sort();
  async function run() {
    for (const file of files) {
      await pool.query(fs.readFileSync('/app/migrations/' + file, 'utf-8'));
      console.log('Migration executed: ' + file);
    }
    await pool.end();
    console.log('All migrations complete');
  }
  run().catch(e => { console.error(e); process.exit(1); });
"

echo "Running user seed..."
node -e "
  const { Pool } = require('pg');
  const bcrypt = require('bcrypt');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async function seed() {
    const users = [
      { email: 'admin@elite.com', password: 'admin123', vecino_piso: '1A', role: 'admin' },
      { email: 'directiva@elite.com', password: 'directiva123', vecino_piso: '6A', role: 'directiva' },
      { email: 'vecino1@elite.com', password: 'password1', vecino_piso: '2A', role: 'usuario' },
      { email: 'vecino2@elite.com', password: 'password1', vecino_piso: '3A', role: 'usuario' },
      { email: 'vecino3@elite.com', password: 'password1', vecino_piso: '4A', role: 'usuario' },
      { email: 'vecino4@elite.com', password: 'password1', vecino_piso: '5A', role: 'usuario' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await pool.query(
        'INSERT INTO usuarios (email, password_hash, vecino_piso, role) VALUES (\$1, \$2, \$3, \$4) ON CONFLICT (email) DO NOTHING',
        [u.email, hash, u.vecino_piso, u.role]
      );
      console.log('Usuario creado: ' + u.email);
    }
    await pool.end();
    console.log('Seed usuarios completo');
  }

  seed().catch(e => { console.error(e); process.exit(1); });
"

echo "Seeding facturaelectrica..."
node -e "
  const { Pool } = require('pg');
  const fs = require('fs');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query(fs.readFileSync('/app/init/04-seed-facturaelectrica.sql', 'utf-8'))
    .then(() => { console.log('Facturaelectrica seed complete'); return pool.end(); })
    .catch(e => { console.error(e); process.exit(1); });
"

echo "Init complete"
