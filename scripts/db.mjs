import pg from 'pg';

export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi.');

  let url;

  try {
    url = new URL(process.env.DATABASE_URL);
  } catch {
    throw new Error('DATABASE_URL tidak valid. Nilai disembunyikan.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('DATABASE_URL harus memakai protokol postgresql.');
  }

  for (const name of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
    url.searchParams.delete(name);
  }

  return new pg.Client({
    connectionString: url.toString(),
    ssl: {
      rejectUnauthorized: true,
      ...(process.env.DATABASE_CA_CERT
        ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
        : {}),
    },
    connectionTimeoutMillis: 8000,
    statement_timeout: 15000,
  });
}

export function reportError(error) {
  console.error('Operasi gagal. Kode:', error.code || error.name || 'UNKNOWN');
  console.error(
    'Periksa konfigurasi/sertifikat dan log database privat. Kredensial tidak dicetak.',
  );
  process.exitCode = 1;
}
