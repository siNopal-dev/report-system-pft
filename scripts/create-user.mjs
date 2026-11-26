import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { database, reportError } from './db.mjs';
import { hashPassword, normalizeUsername, validUsername } from '../lib/password.mjs';

try {
  process.loadEnvFile('.env.local');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

function secret(question) {
  if (!stdin.isTTY) {
    throw Error(
      'Jalankan perintah ini pada terminal interaktif agar password tidak tampil.',
    );
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  let value = '';

  return new Promise((resolve, reject) => {
    const finish = (error) => {
      stdin.off('data', read);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');

      if (error) reject(error);
      else resolve(value);
    };

    const read = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') {
          finish(Error('Dibatalkan.'));
          return;
        }

        if (character === '\r' || character === '\n') {
          finish();
          return;
        }

        if (character === '\u007f' || character === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
        } else if (character >= ' ' && value.length < 256) {
          value += character;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', read);
  });
}

try {
  const prompt = createInterface({ input: stdin, output: stdout });
  const username = normalizeUsername(await prompt.question('Username baru: '));
  prompt.close();

  if (!validUsername(username)) {
    throw Error(
      'Username 3–40 karakter: huruf, angka, titik, garis bawah atau tanda minus.',
    );
  }

  const role = process.argv.includes('--finishing') ? 'finishing' : process.argv.includes('--printing') ? 'printing' : 'process';
  const password = await secret('Password baru (minimal 5 karakter): ');

  if (password.length < 5) throw Error('Password minimal 5 karakter.');

  const confirm = await secret('Ulangi password: ');
  if (password !== confirm) throw Error('Password tidak sama.');

  const db = database();

  try {
    await db.connect();
    await db.query(
      'insert into public.ppc_users(username,password_hash,access_role) values($1,$2,$3)',
      [username, await hashPassword(password), role],
    );
  } finally {
    await db.end();
  }

  console.log(`Pengguna ${username} berhasil dibuat. Silakan login di aplikasi.`);
} catch (error) {
  if (error.code === '23505') console.error('Username sudah digunakan.');
  else if (error.code) reportError(error);
  else console.error(error.message);

  process.exitCode = 1;
}
