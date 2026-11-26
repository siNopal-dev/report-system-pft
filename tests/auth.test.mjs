import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  normalizeUsername,
  validUsername,
  digest,
  newToken,
  dummyHash,
} from '../lib/password.mjs';

test('salted hashes verify password without retaining plaintext', async () => {
  const a = await hashPassword('contoh123');
  const b = await hashPassword('contoh123');

  assert.notEqual(a, b);
  assert.equal(await verifyPassword('contoh123', a), true);
  assert.equal(await verifyPassword('salah', a), false);
  assert.equal(await verifyPassword('contoh123', 'plaintext'), false);
  assert.equal(await verifyPassword('contoh123', dummyHash), false);
});

test('username is normalized with constrained characters', () => {
  assert.equal(normalizeUsername(' AdmIT '), 'admit');
  assert.equal(validUsername('admit'), true);
  assert.equal(validUsername("a' or true"), false);
  assert.equal(validUsername('ab'), false);
});

test('session tokens are random and stored as a different digest', () => {
  const a = newToken();
  const b = newToken();

  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.notEqual(a, digest(a));
  assert.equal(digest(a), digest(a));
});
