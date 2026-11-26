import { database, reportError } from './db.mjs';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

const db = database();

try {
  await db.connect();
  await db.query('select id from public.ppc_users limit 0');
  console.log('Koneksi database PPC berhasil. Tabel pengguna siap.');
} catch (error) {
  reportError(error);
} finally {
  await db.end();
}
