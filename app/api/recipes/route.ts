import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../lib/server-db';
import { currentUser, sameOrigin } from '../../../lib/auth';
import { number, fields } from '../../../lib/template-fa.mjs';

export const dynamic = 'force-dynamic';

export function valid(data: any) {
  const identityValid =
    data &&
    typeof data.identity === 'object' &&
    data.identity &&
    Object.keys(fields).every(
      (key) =>
        typeof data.identity[key] === 'string' && data.identity[key].length <= 2000,
    ) &&
    data.identity.kode.trim() &&
    data.identity.resep.trim();

  if (!identityValid) return false;

  if (typeof data.notes !== 'string' || data.notes.length > 10000) return false;

  const printedValid = data.printed && ['lusi', 'pakan'].every((side) => {
    const rowsValid =
      Array.isArray(data[side]) &&
      data[side].length > 0 &&
      data[side].length <= 200 &&
      data[side].every(
        (row: any) =>
          row &&
          typeof row.yarn === 'string' &&
          row.yarn.trim() &&
          row.yarn.length <= 200 &&
          typeof row.color === 'string' &&
          row.color.trim() &&
          row.color.length <= 500 &&
          typeof row.kg === 'string' &&
          Number.isFinite(number(row.kg)) &&
          number(row.kg) > 0,
      );

    const totalValid =
      data.printed[side] === null ||
      (typeof data.printed[side] === 'number' &&
        Number.isFinite(data.printed[side]) &&
        data.printed[side] >= 0);

    return rowsValid && totalValid;
  });

  return Boolean(printedValid);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401 },
      );
    }

    if (user.access_role !== 'all') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Gunakan data JSON.' }, { status: 415 });
    }

    const text = await request.text();
    if (text.length > 250000) {
      return NextResponse.json(
        { error: 'Data resep terlalu besar.' },
        { status: 413 },
      );
    }

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Format data tidak valid.' },
        { status: 400 },
      );
    }

    if (
      !body ||
      !valid(body.data) ||
      (body.source_name != null &&
        (typeof body.source_name !== 'string' || body.source_name.length > 500))
    ) {
      return NextResponse.json(
        {
          error:
            'Periksa identitas, nomor benang, warna, dan KG positif pada seluruh baris.',
        },
        { status: 400 },
      );
    }

    const { rows } = await database().query(
      'insert into public.ppc_documents(app_user_id,owner_id,template_key,recipe_number,source_name,data) values($1,null,$2,$3,$4,$5) returning id',
      [
        user.id,
        'fa-palekat-v1',
        body.data.identity.resep.trim(),
        body.source_name || null,
        JSON.stringify(body.data),
      ],
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch (error) {
    const duplicate = (error as { code?: string }).code === '23505';

    return NextResponse.json(
      {
        error: duplicate
          ? 'Nomor resep sudah tersimpan. Gunakan nomor revisi berbeda.'
          : 'Gagal mengakses database. Periksa DATABASE_URL.',
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu.' },
        { status: 401 },
      );
    }

    if (user.access_role !== 'all') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
    }

    const all = request.nextUrl.searchParams.get('all') === '1';

    const { rows } = await database().query(
      'select id,recipe_number,data,created_at from public.ppc_documents where app_user_id=$1 order by created_at desc' +
        (all ? '' : ' limit 50'),
      [user.id],
    );

    return NextResponse.json(
      { data: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    const duplicate = (error as { code?: string }).code === '23505';

    return NextResponse.json(
      {
        error: duplicate
          ? 'Nomor resep sudah tersimpan. Gunakan nomor revisi berbeda.'
          : 'Gagal mengakses database. Periksa DATABASE_URL.',
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}
