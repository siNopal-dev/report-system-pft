import 'server-only';
import { cookies } from 'next/headers';
import { database } from './server-db';
import { digest } from './password.mjs';

export const COOKIE = 'ppc_session';
export const sessionAge = 12 * 60 * 60;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionAge,
  };
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;

  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const { rows } = await database().query(
    'select u.id,u.username,u.access_role,u.process_stage from public.ppc_sessions s join public.ppc_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.is_active=true',
    [digest(token)],
  );

  return rows[0] || null;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;

  return (
    !!origin &&
    origin === expected &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  );
}
