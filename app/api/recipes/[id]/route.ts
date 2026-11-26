import { NextRequest, NextResponse } from 'next/server';
import { database } from '../../../../lib/server-db';
import { currentUser, sameOrigin } from '../../../../lib/auth';
import { valid } from '../route';

export const dynamic = 'force-dynamic';

type Context = {
  params: Promise<{ id: string }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: NextRequest, { params }: Context) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

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

  const { id } = await params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: 'ID resep tidak valid.' }, { status: 400 });
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

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: 'Format data tidak valid.' },
      { status: 400 },
    );
  }

  if (!valid(body?.data)) {
    return NextResponse.json(
      { error: 'Periksa identitas, rincian benang, dan KG positif.' },
      { status: 400 },
    );
  }

  try {
    const { rows } = await database().query(
      'update public.ppc_documents set recipe_number=$1,data=$2 where id=$3 and app_user_id=$4 returning id',
      [body.data.identity.resep.trim(), JSON.stringify(body.data), id, user.id],
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: 'Resep tidak ditemukan atau bukan milik akun ini.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ id: rows[0].id });
  } catch (error) {
    const duplicate = (error as { code?: string }).code === '23505';

    return NextResponse.json(
      {
        error: duplicate
          ? 'Nomor resep sudah dipakai.'
          : 'Gagal memperbarui resep.',
      },
      { status: duplicate ? 409 : 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: 'Permintaan tidak diizinkan.' },
      { status: 403 },
    );
  }

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

  const { id } = await params;
  if (!uuid.test(id)) {
    return NextResponse.json({ error: 'ID resep tidak valid.' }, { status: 400 });
  }

  try {
    const { rows } = await database().query(
      'delete from public.ppc_documents where id=$1 and app_user_id=$2 returning id',
      [id, user.id],
    );

    if (!rows.length) {
      return NextResponse.json(
        { error: 'Resep tidak ditemukan atau bukan milik akun ini.' },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: 'Gagal menghapus resep.' }, { status: 500 });
  }
}
