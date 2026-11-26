import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../../lib/server-db';
import { COOKIE, cookieOptions, sameOrigin } from '../../../../lib/auth';
import { digest } from '../../../../lib/password.mjs';

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

  try {
    const token = request.cookies.get(COOKIE)?.value;

    if (token) {
      await database().query(
        'delete from public.ppc_sessions where token_hash=$1',
        [digest(token)],
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json(
      { error: 'Gagal keluar. Periksa koneksi database dan coba lagi.' },
      { status: 500 },
    );
  }
}
