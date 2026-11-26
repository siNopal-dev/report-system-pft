import 'server-only';
import pg, { type PoolClient } from 'pg';

const globalDb = globalThis as unknown as { ppcPool?: pg.Pool };

export function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi.');

  if (!globalDb.ppcPool) {
    const url = new URL(process.env.DATABASE_URL);

    // pg connection-string sslmode can override ssl options: reject ambiguity.
    for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) {
      url.searchParams.delete(key);
    }

    globalDb.ppcPool = new pg.Pool({
      connectionString: url.toString(),
      ssl: {
        rejectUnauthorized: true,
        ...(process.env.DATABASE_CA_CERT
          ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
          : {}),
      },
      max: 5,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
    });

    globalDb.ppcPool.on('error', () =>
      console.error('Database pool connection failed'),
    );
  }

  return globalDb.ppcPool;
}

export async function transaction<T>(
  callback: (db: PoolClient) => Promise<T>,
): Promise<T> {
  const db = await database().connect();

  try {
    await db.query('BEGIN');
    const result = await callback(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
