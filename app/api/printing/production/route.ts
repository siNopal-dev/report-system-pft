import { NextRequest, NextResponse } from 'next/server';
import { currentUser, sameOrigin } from '../../../../lib/auth';
import { database } from '../../../../lib/server-db';

export const dynamic = 'force-dynamic';

const shifts = ['Shift 1', 'Shift 2', 'Shift 3'];
const machines = ['F1', 'F2', 'F3'];
const issues = [
  'Tidak Ada',
  'Ganti Motif/Warna',
  'Cuci Plangkan',
  'Persiapan Produksi',
  'Pasta Saring',
  'Mesin Trouble',
  'Uap Down',
  'Screen Sobek/Bocor',
  'Tunggu Pasta',
  'Tunggu Kain',
  'Kain Trouble',
  'Air Mati',
  'Listrik Padam',
  'perbaikan Screen',
  'Perbaikan Rakhel',
  'Lain-lain',
];

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function validate(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const date = String(input.production_date || '');
  const quantity = Number(input.production_quantity);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  if (
    !shifts.includes(String(input.shift)) ||
    !machines.includes(String(input.mc_flat))
  ) {
    return null;
  }

  if (
    input.production_quantity === '' || input.production_quantity === null ||
    !Number.isFinite(quantity) || quantity < 0 || quantity > 1e9 ||
    !['Meter','Kodi'].includes(String(input.unit))
  ) {
    return null;
  }

  if (
    !Array.isArray(input.issues) ||
    input.issues.length < 1 ||
    input.issues.length > 30
  ) {
    return null;
  }

  const entries = input.issues.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;

    const row = item as Record<string, unknown>;
    const minutes = row.lost_minutes === '' || row.lost_minutes === null ? null : Number(row.lost_minutes);

    if (
      !issues.includes(String(row.issue)) ||
      (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440)) ||
      (row.issue === 'Tidak Ada' && minutes !== null && minutes !== 0)
    ) {
      return null;
    }

    return { issue: String(row.issue), lost_minutes: minutes };
  });

  if (entries.some((row) => row === null)) return null;
  if (entries.length > 1 && entries.some((row) => row!.issue === 'Tidak Ada')) return null;

  const total = entries.reduce((sum, row) => sum + (row!.lost_minutes ?? 0), 0);
  if (total > 1440) return null;

  if (typeof input.notes !== 'string' || input.notes.length > 1000) return null;

  return {
    date,
    shift: String(input.shift),
    machine: String(input.mc_flat),
    quantity,
    unit: String(input.unit),
    minutes: total,
    issue: entries[0]!.issue,
    entries,
    notes: input.notes.trim(),
  };
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.', 401);

    if (user.access_role !== 'printing' && user.access_role !== 'all') {
      return fail('Akses printing belum diberikan.', 403);
    }

    const { rows } = await database().query(
      'select id,production_date::text,shift,mc_flat,coalesce(production_quantity,production_meters)::float8 as production_quantity,unit,lost_minutes,issue,issues,notes,created_at from public.printing_lost_time order by production_date desc,created_at desc limit 5000',
    );

    return NextResponse.json(
      { data: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return fail('Gagal memuat data produksi printing.', 500);
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail('Permintaan tidak diizinkan.', 403);

  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.', 401);

    if (user.access_role !== 'printing' && user.access_role !== 'all') {
      return fail('Akses printing belum diberikan.', 403);
    }

    const text = await request.text();
    if (text.length > 4000) return fail('Data terlalu besar.', 413);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return fail('Data tidak valid.', 400);
    }

    const value = validate(raw);
    if (!value) return fail('Periksa tanggal, pilihan, dan angka pada formulir.', 400);

    const { rows } = await database().query(
      'insert into public.printing_lost_time(production_date,shift,mc_flat,production_quantity,unit,lost_minutes,issue,issues,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id',
      [
        value.date,
        value.shift,
        value.machine,
        value.quantity,
        value.unit,
        value.minutes,
        value.issue,
        JSON.stringify(value.entries),
        value.notes,
        user.id,
      ],
    );

    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch {
    return fail('Gagal menyimpan data.', 500);
  }
}
