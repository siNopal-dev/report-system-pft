import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../../lib/server-db';
import { COOKIE, cookieOptions, sameOrigin, sessionAge } from '../../../../lib/auth';
import {
  normalizeUsername,
  validUsername,
  verifyPassword,
  dummyHash,
  newToken,
  digest,
} from '../../../../lib/password.mjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

  try {
    const text = await request.text();

    if (text.length > 2048) {
      return NextResponse.json(
        { error: 'Data login terlalu panjang.' },
        { status: 413 },
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Format login tidak valid.' },
        { status: 400 },
      );
    }

    const username = normalizeUsername(body?.username);
    const password = body?.password;

    if (
      !validUsername(username) ||
      typeof password !== 'string' ||
      password.length < 5 ||
      password.length > 256
    ) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 },
      );
    }

    const db = database();

    const { rows: limits } = await db.query(
      'select public.ppc_take_login_attempt($1) as allowed',
      [digest(username)],
    );

    if (!limits[0].allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan. Coba lagi setelah 15 menit.' },
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }

    const { rows: users } = await db.query(
      'select id,password_hash,is_active,access_role from public.ppc_users where username=$1',
      [username],
    );

    const user = users[0];
    const valid = await verifyPassword(password, user?.password_hash || dummyHash);

    if (!user || !user.is_active || !valid) {
      return NextResponse.json(
        { error: 'Username atau password salah.' },
        { status: 401 },
      );
    }

    const token = newToken();

    // Replacing an existing browser session prevents accumulating sessions on re-login.
    const old = request.cookies.get(COOKIE)?.value;
    if (old) {
      await db.query('delete from public.ppc_sessions where token_hash=$1', [
        digest(old),
      ]);
    }

    await db.query(
      'insert into public.ppc_sessions(token_hash,user_id,expires_at) values($1,$2,$3)',
      [digest(token), user.id, new Date(Date.now() + sessionAge * 1000)],
    );

    const response = NextResponse.json(
      {
        ok: true,
        home:
          user.access_role === 'all'
            ? 'scan'
            : user.access_role === 'printing'
              ? 'printing'
              : 'finishing',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );

    response.cookies.set(COOKIE, token, cookieOptions());
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Login gagal. Periksa DATABASE_URL dan koneksi database.' },
      { status: 500 },
    );
  }
}
