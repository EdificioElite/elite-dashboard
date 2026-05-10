const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/elite',
  });

  const users = [
    { email: 'admin@elite.com', password: 'admin123', vecino_piso: '1A', is_admin: true },
    { email: 'vecino1@elite.com', password: 'password1', vecino_piso: '2A', is_admin: false },
    { email: 'vecino2@elite.com', password: 'password1', vecino_piso: '3A', is_admin: false },
    { email: 'vecino3@elite.com', password: 'password1', vecino_piso: '4A', is_admin: false },
    { email: 'vecino4@elite.com', password: 'password1', vecino_piso: '5A', is_admin: false },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      'INSERT INTO usuarios (email, password_hash, vecino_piso, is_admin) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [u.email, hash, u.vecino_piso, u.is_admin]
    );
    console.log('Usuario creado: ' + u.email);
  }

  await pool.end();
  console.log('Seed usuarios completo');
}

seed().catch((e) => {
  console.error('Seed usuarios failed:', e);
  process.exit(1);
});
