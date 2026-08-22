const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/elite',
  });

  const users = [
    { email: 'admin@elite.com', password: 'admin123', vecino_piso: '1A', role: 'admin' },
    { email: 'directiva@elite.com', password: 'directiva123', vecino_piso: '1A', role: 'directiva' },
    { email: 'vecino1@elite.com', password: 'password1', vecino_piso: '2A', role: 'usuario' },
    { email: 'vecino2@elite.com', password: 'password1', vecino_piso: '3A', role: 'usuario' },
    { email: 'vecino3@elite.com', password: 'password1', vecino_piso: '4A', role: 'usuario' },
    { email: 'vecino4@elite.com', password: 'password1', vecino_piso: '5A', role: 'usuario' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      'INSERT INTO usuarios (email, password_hash, vecino_piso, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      [u.email, hash, u.vecino_piso, u.role]
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
