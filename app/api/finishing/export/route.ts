import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { currentUser } from '../../../../lib/auth';
import { database } from '../../../../lib/server-db';
import { finishingAllowed } from '../../../../lib/finishing';
import { finishingWhere } from '../../../../lib/finishing-query';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({error:'Silakan login.'},{status:401});
    if (!finishingAllowed(user)) return NextResponse.json({error:'Akses ditolak.'},{status:403});
    const where = finishingWhere(request.nextUrl.searchParams,user);
    if (!where) return NextResponse.json({error:'Filter tidak valid.'},{status:400});
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Produksi Finishing');
    sheet.columns = [
      {header:'Tanggal',key:'date',width:16},{header:'Bagian',key:'section',width:23},
      {header:'Mesin',key:'machine',width:18},{header:'Shift',key:'shift',width:12},
      {header:'Jumlah Produksi',key:'quantity',width:20},{header:'Satuan',key:'unit',width:12},
      {header:'Kecepatan Mesin',key:'speed',width:20},{header:'Downtime/Kendala',key:'issue',width:25},
      {header:'Keterangan',key:'notes',width:40},
    ];
    sheet.getRow(1).font = {bold:true,color:{argb:'FFFFFFFF'}};
    sheet.getRow(1).fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FF15315B'}};
    const pageSize = 1000;
    let cursor: {production_date:string;created_at:string;id:string}|null = null;
    do {
      const params: unknown[] = [...where.values];
      let seek = '';
      if (cursor) {
        params.push(cursor.production_date,cursor.created_at,cursor.id);
        seek = ` and (production_date,created_at,id) < ($${params.length-2}::date,$${params.length-1}::timestamptz,$${params.length}::uuid)`;
      }
      const {rows} = await database().query(`select id,production_date::text,section,machine,shift,production_quantity::float8,unit,machine_speed::float8,issue,issues,notes,created_at from public.finishing_production where ${where.sql}${seek} order by production_date desc,created_at desc,id desc limit ${pageSize}`,params);
      for (const row of rows) sheet.addRow({date:row.production_date,section:row.section,machine:row.machine,shift:row.shift,quantity:row.production_quantity,unit:row.unit,speed:row.machine_speed,issue:row.issues.map((item:{issue:string;lost_minutes:number|null})=>`${item.issue}${item.lost_minutes === null ? '' : ` (${item.lost_minutes} menit)`}`).join(', '),notes:row.notes});
      cursor = rows.length === pageSize ? rows[rows.length-1] : null;
    } while (cursor);
    sheet.autoFilter = {from:'A1',to:'I1'};
    sheet.getColumn('quantity').numFmt = '#,##0.###';
    sheet.getColumn('speed').numFmt = '#,##0.###';
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="rekap-finishing.xlsx"','Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Gagal membuat file Excel.'},{status:500}); }
}
