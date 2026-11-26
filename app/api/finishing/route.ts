import { NextRequest, NextResponse } from 'next/server';
import { currentUser, sameOrigin } from '../../../lib/auth';
import { database } from '../../../lib/server-db';
import { finishingAllowed, allowedSections, validateFinishing } from '../../../lib/finishing';
import { finishingWhere } from '../../../lib/finishing-query';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const fail = (error: string, status: number) => NextResponse.json({error}, {status});
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const columns = 'id,production_date::text,section,machine,shift,production_quantity::float8,unit,machine_speed::float8,issue,issues,notes,created_at';
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.', 401);
    if (!finishingAllowed(user)) return fail('Akses ditolak.', 403);
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      if (!uuid(id)) return fail('ID tidak valid.', 400);
      const {rows} = await database().query(`select ${columns} from public.finishing_production where id=$1 and section=any($2::text[])`,[id,allowedSections(user)]);
      return rows.length ? NextResponse.json({data:rows[0]}) : fail('Data tidak ditemukan.',404);
    }
    const where = finishingWhere(request.nextUrl.searchParams, user);
    if (!where) return fail('Filter tidak valid.',400);
    const page = Number(request.nextUrl.searchParams.get('page') || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return fail('Halaman tidak valid.',400);
    const {rows} = await database().query(`select ${columns} from public.finishing_production where ${where.sql} order by production_date desc,created_at desc,id desc limit 100 offset $${where.values.length+1}`, [...where.values,(page-1)*100]);
    const summary = await database().query(`select section,unit,count(*)::int as entries,coalesce(sum(production_quantity),0)::float8 as total from public.finishing_production where ${where.sql} group by section,unit`,where.values);
    const count = await database().query(`select count(*)::int as total from public.finishing_production where ${where.sql}`,where.values);
    return NextResponse.json({data:rows,summary:summary.rows,total:count.rows[0].total,page}, {headers:{'Cache-Control':'no-store'}});
  } catch { return fail('Gagal memuat data finishing.',500); }
}
async function bodyOf(request: NextRequest) {
  const text = await request.text();
    if (text.length > 12000) return null;
  try { return JSON.parse(text); } catch { return null; }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail('Permintaan tidak diizinkan.',403);
  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.',401);
    if (!finishingAllowed(user)) return fail('Akses ditolak.',403);
    const data = validateFinishing(await bodyOf(request));
    if (!data) return fail('Periksa tanggal, pilihan, dan angka formulir.',400);
    if (!allowedSections(user).includes(data.section)) return fail('Bagian ini terkunci untuk akun Anda.',403);
    const {rows} = await database().query('insert into public.finishing_production(production_date,section,machine,shift,production_quantity,unit,machine_speed,issue,issues,notes,created_by) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) returning id',
      [data.production_date,data.section,data.machine,data.shift,data.production_quantity,data.unit,data.machine_speed,data.issue,JSON.stringify(data.issues),data.notes,user.id]);
    return NextResponse.json({id:rows[0].id},{status:201});
  } catch { return fail('Gagal menyimpan data finishing.',500); }
}
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return fail('Permintaan tidak diizinkan.',403);
  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.',401);
    if (!finishingAllowed(user)) return fail('Akses ditolak.',403);
    const raw = await bodyOf(request);
    if (!uuid(raw?.id)) return fail('ID tidak valid.',400);
    const data = validateFinishing(raw?.data);
    if (!data) return fail('Data tidak valid.',400);
    if (!allowedSections(user).includes(data.section)) return fail('Bagian ini terkunci untuk akun Anda.',403);
    const {rows} = await database().query('update public.finishing_production set production_date=$1,section=$2,machine=$3,shift=$4,production_quantity=$5,unit=$6,machine_speed=$7,issue=$8,issues=$9::jsonb,notes=$10,updated_at=now() where id=$11 and section=any($12::text[]) returning id',
      [data.production_date,data.section,data.machine,data.shift,data.production_quantity,data.unit,data.machine_speed,data.issue,JSON.stringify(data.issues),data.notes,raw.id,allowedSections(user)]);
    return rows.length ? NextResponse.json({id:rows[0].id}) : fail('Data tidak ditemukan.',404);
  } catch { return fail('Gagal memperbarui data finishing.',500); }
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return fail('Permintaan tidak diizinkan.',403);
  try {
    const user = await currentUser();
    if (!user) return fail('Silakan login.',401);
    if (!finishingAllowed(user)) return fail('Akses ditolak.',403);
    const id = request.nextUrl.searchParams.get('id');
    if (!uuid(id)) return fail('ID tidak valid.',400);
    const {rowCount} = await database().query('delete from public.finishing_production where id=$1 and section=any($2::text[])',[id,allowedSections(user)]);
    return rowCount ? NextResponse.json({ok:true}) : fail('Data tidak ditemukan.',404);
  } catch { return fail('Gagal menghapus data finishing.',500); }
}
