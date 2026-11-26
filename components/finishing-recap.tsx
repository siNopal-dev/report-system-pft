'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import AppShell from './app-shell';
import {finishingMachines,finishingSections,finishingShifts,finishingUnits,type FinishingData,type FinishingSection} from '../lib/finishing';
type Filter={from:string;to:string;section:string;machine:string;shift:string;unit:string};
type Summary={section:FinishingSection;unit:string;entries:number;total:number};
const empty:Filter={from:'',to:'',section:'',machine:'',shift:'',unit:''};
const fmt=(value:number)=>Number(value).toLocaleString('id-ID',{maximumFractionDigits:3});
export default function FinishingRecap({username,role,sections}:{username:string;role:string;sections:FinishingSection[]}) {
  const [filter,setFilter]=useState<Filter>(empty);
  const [rows,setRows]=useState<FinishingData[]>([]);
  const [summary,setSummary]=useState<Summary[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(1);
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const params=useMemo(()=>{const p=new URLSearchParams();Object.entries(filter).forEach(([key,value])=>{if(value)p.set(key,value)});return p},[filter]);
  const query=params.toString();
  const load=useCallback(async()=>{
    try {const response=await fetch(`/api/finishing?${query}&page=${page}`,{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error||'Gagal memuat data.');setRows(body.data);setSummary(body.summary);setTotal(body.total);setMessage('');}
    catch(error){setMessage(error instanceof Error?error.message:'Gagal memuat data.');}
  },[query,page]);
  useEffect(()=>{void load()},[load]);
  function update(key:keyof Filter,value:string){setPage(1);setFilter(old=>({...old,[key]:value,...(key==='section'?{machine:''}:{})}));}
  const count=summary.reduce((sum,row)=>sum+row.entries,0);
  const amount=(section:string,unit:string)=>summary.filter(row=>(!section||row.section===section)&&row.unit===unit).reduce((sum,row)=>sum+Number(row.total),0);
  const totals=finishingUnits.map(unit=>`${fmt(amount('',unit))} ${unit.toLowerCase()}`);
  async function remove(row:FinishingData){
    if(!confirm(`Hapus produksi ${row.section} tanggal ${row.production_date}?`))return;
    setBusy(true);
    try{const response=await fetch(`/api/finishing?id=${encodeURIComponent(row.id)}`,{method:'DELETE'});const body=await response.json();if(!response.ok)throw Error(body.error||'Gagal menghapus.');await load();}
    catch(error){setMessage(error instanceof Error?error.message:'Gagal menghapus.');}finally{setBusy(false)}
  }
  async function exportExcel(){
    setBusy(true);
    try{const response=await fetch(`/api/finishing/export?${query}`);if(!response.ok){const body=await response.json();throw Error(body.error||'Gagal ekspor.');}
      const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='rekap-finishing.xlsx';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(error){setMessage(error instanceof Error?error.message:'Gagal ekspor.');}finally{setBusy(false)}
  }
  return <AppShell username={username} role={role}>
    <div className="page-heading"><small>FINISHING · REKAP</small><h1>Rekap Produksi Finishing</h1><p>Monitoring dan rincian produksi mengikuti filter yang dipilih.</p></div>
    <section className="panel"><h2>Filter Rekap</h2><div className="grid">
      <label>Dari Tanggal<input type="date" value={filter.from} onChange={e=>update('from',e.target.value)}/></label>
      <label>Sampai Tanggal<input type="date" value={filter.to} onChange={e=>update('to',e.target.value)}/></label>
      <label>Bagian<select value={filter.section} onChange={e=>update('section',e.target.value)}><option value="">Semua Bagian</option>{sections.map(s=><option key={s}>{s}</option>)}</select></label>
      <label>Mesin<select value={filter.machine} onChange={e=>update('machine',e.target.value)}><option value="">Semua Mesin</option>{(filter.section?finishingMachines[filter.section as FinishingSection]:finishingSections.flatMap(s=>finishingMachines[s])).map(m=><option key={m}>{m}</option>)}</select></label>
       <label>Shift<select value={filter.shift} onChange={e=>update('shift',e.target.value)}><option value="">Semua Shift</option>{finishingShifts.map(s=><option key={s}>{s}</option>)}</select></label>
       <label>Satuan<select value={filter.unit} onChange={e=>update('unit',e.target.value)}><option value="">Semua Satuan</option>{finishingUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label>
    </div></section>
    <h2>Monitoring Produksi</h2><div className="dash-metrics">{[['Total Meter',`${fmt(amount('','Meter'))} meter`],['Total Kodi',`${fmt(amount('','Kodi'))} kodi`],['Total Potong',`${fmt(amount('','Potong'))} potong`],['Jumlah Input',fmt(count)]].map(([label,value])=><div className="grand" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
     <section className="panel"><h2>Produksi per Bagian</h2><div className="table"><table><thead><tr><th>Bagian</th><th>Meter</th><th>Kodi</th><th>Potong</th><th>Jumlah Input</th></tr></thead><tbody>{sections.map(section=><tr key={section}><td>{section}</td>{finishingUnits.map(unit=><td key={unit}>{fmt(amount(section,unit))}</td>)}<td>{fmt(summary.filter(r=>r.section===section).reduce((sum,r)=>sum+r.entries,0))}</td></tr>)}</tbody><tfoot><tr><th scope="row">Total (sesuai filter)</th>{finishingUnits.map(unit=><td key={unit}>{fmt(amount('',unit))}</td>)}<td>{fmt(count)}</td></tr></tfoot></table></div></section>
    <section className="panel"><div className="section-head"><h2>Daftar Produksi ({fmt(total)})</h2><div className="row-actions"><button onClick={()=>void load()}>Muat Ulang</button><button onClick={()=>void exportExcel()} disabled={busy}>Export Excel</button><a className="link-button" href="/finishing">Tambah Data</a></div></div>
       <div className="table"><table><thead><tr>{['Tanggal','Bagian','Mesin','Shift','Jumlah Produksi','Satuan','Kecepatan Mesin','Downtime / Kendala','Keterangan','Aksi'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.production_date}</td><td>{row.section}</td><td>{row.machine}</td><td>{row.shift}</td><td>{fmt(row.production_quantity)}</td><td>{row.unit}</td><td>{fmt(row.machine_speed)}</td><td>{(row.issues?.length?row.issues:[{issue:row.issue,lost_minutes:null}]).map((item,index)=><div key={index}>{item.issue}{item.lost_minutes === null?'':` (${fmt(item.lost_minutes)} menit)`}</div>)}</td><td>{row.notes||'—'}</td><td><div className="row-actions"><a className="link-button" href={`/finishing?edit=${encodeURIComponent(row.id)}`}>Edit</a><button className="delete-recipe" disabled={busy} onClick={()=>void remove(row)}>Hapus</button></div></td></tr>)}</tbody><tfoot><tr><th colSpan={4} scope="row">Total seluruh hasil filter ({fmt(total)} input, semua halaman)</th><td>{totals.map(value=><div key={value}>{value}</div>)}</td><td>per satuan</td><td>—</td><td colSpan={3}>Total tidak menjumlahkan satuan yang berbeda.</td></tr></tfoot></table>{!rows.length&&<p className="empty">Belum ada data untuk filter ini.</p>}</div>
      <div className="row-actions" style={{marginTop:16}}><button disabled={page<=1} onClick={()=>setPage(page-1)}>Sebelumnya</button><span>Halaman {page} dari {Math.max(1,Math.ceil(total/100))}</span><button disabled={page*100>=total} onClick={()=>setPage(page+1)}>Berikutnya</button></div>
    </section>{message&&<p role="status" className="status">{message}</p>}
  </AppShell>;
}
