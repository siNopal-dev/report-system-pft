import {NextRequest,NextResponse} from 'next/server';
import {currentUser,sameOrigin} from '../../../../lib/auth';
import {database} from '../../../../lib/server-db';
import {finishingAllowed,allowedSections} from '../../../../lib/finishing';
import {definitions,inputKeys} from '../../../../lib/finishing-report';
export const runtime='nodejs';export const dynamic='force-dynamic';
const fail=(error:string,status:number)=>NextResponse.json({error},{status});
const validMonth=(month:unknown):month is string=>typeof month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>=2000&&Number(month.slice(0,4))<=2100;
const permitted=(role:string,stages:string[])=>role!=='process'?definitions:definitions.filter(d=>stages.some(s=>({bakar:'Bakar Bulu',washing:'Desizing/Washing',kalender:'Calendar',stenter:'Stenter'} as Record<string,string>)[d.id]===s));
async function access(){const user=await currentUser();return user&&finishingAllowed(user)?user:null}
export async function GET(request:NextRequest){
 try {const user=await access();if(!user)return fail('Silakan login dengan akses finishing.',403);
 const month=request.nextUrl.searchParams.get('month');if(!validMonth(month))return fail('Periode tidak valid.',400);
 const allowed=permitted(user.access_role,allowedSections(user));
 const {rows}=await database().query('select report_date::text, section, values_json, updated_at::text from public.finishing_daily_report where report_date >= $1::date and report_date < ($1::date + interval \'1 month\') and section=any($2::text[]) order by report_date',[month+'-01',allowed.map(d=>d.id)]);
 return NextResponse.json({data:rows,allowed:allowed.map(d=>d.id)},{headers:{'Cache-Control':'no-store'}});
 }catch{return fail('Gagal memuat laporan. Periksa migrasi database.',500)}
}
async function write(request:NextRequest,mode:'add'|'edit'){
 if(!sameOrigin(request))return fail('Permintaan tidak diizinkan.',403);
 try {const user=await access();if(!user)return fail('Akses ditolak.',403);
 const raw=await request.text();if(raw.length>10000)return fail('Data terlalu besar.',400);
 const body=JSON.parse(raw);const section=definitions.find(d=>d.id===body?.section);
 const date=body?.date;const month=body?.month;
 if(!section||!permitted(user.access_role,allowedSections(user)).includes(section)||!validMonth(month)||typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!date.startsWith(month+'-')||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)return fail('Tanggal atau bagian tidak valid.',400);
 const values=body?.values;if(!values||typeof values!=='object'||Array.isArray(values))return fail('Data tidak valid.',400);
 const keys=inputKeys(section);if(Object.keys(values).some(k=>!keys.includes(k)))return fail('Kolom tidak valid.',400);
 for(const val of Object.values(values)){if(typeof val!=='number'||!Number.isFinite(val)||val<0||val>1e9)return fail('Jumlah harus angka positif.',400)}
 if(mode==='add'){
  const {rowCount}=await database().query('insert into public.finishing_daily_report(report_date,section,values_json) values($1,$2,$3::jsonb) on conflict do nothing',[date,section.id,JSON.stringify(values)]);
  if(!rowCount)return fail('Tanggal ini sudah berisi data. Gunakan tombol Edit.',409);
 }else{
  if(typeof body.version!=='string'||body.version.length<20||body.version.length>80)return fail('Versi data tidak valid. Muat ulang halaman.',400);
  const {rowCount}=await database().query('update public.finishing_daily_report set values_json=$3::jsonb,updated_at=clock_timestamp() where report_date=$1 and section=$2 and updated_at::text=$4',[date,section.id,JSON.stringify(values),body.version]);
  if(!rowCount)return fail('Data telah berubah atau tidak ditemukan. Muat ulang sebelum mengedit.',409);
 }
 return NextResponse.json({ok:true});
 }catch{return fail('Gagal menyimpan laporan.',500)}
}
export const POST=(request:NextRequest)=>write(request,'add');
export const PUT=(request:NextRequest)=>write(request,'edit');
