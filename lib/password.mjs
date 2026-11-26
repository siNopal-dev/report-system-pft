import {
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(derive);

export const normalizeUsername = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export const validUsername = (value) => /^[a-z0-9_.-]{3,40}$/.test(value);

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });

  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || password.length > 256) return false;

  const [scheme, salt, hex, ...extra] = String(encoded).split('$');

  if (
    scheme !== 'scrypt' ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{128}$/.test(hex) ||
    extra.length
  ) {
    return false;
  }

  const key = await scrypt(password, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });

  return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}

export const digest = (value) => createHash('sha256').update(value).digest('hex');

export const newToken = () => randomBytes(32).toString('hex');

// Valid fixed hash for equivalent work when a username does not exist.
export const dummyHash = 'scrypt$' + '0'.repeat(32) + '$' + '0'.repeat(128);
