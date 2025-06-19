import pgPromise from 'pg-promise';

const pgp = pgPromise();
const db = pgp({
  host: process.env.PGHOST || 'data.surfrut.com',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'docgen_service',
  user: process.env.PGUSER || 'docgen_user',
  password: process.env.PGPASSWORD,
  max: 20
});

export default db; 