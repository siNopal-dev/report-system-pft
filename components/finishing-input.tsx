'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useSearchParams} from 'next/navigation';
import AppShell from './app-shell';
import {finishingMachines,finishingShifts,finishingUnits,finishingIssues,type FinishingSection,type FinishingData} from '../lib/finishing';
type Form = Omit<FinishingData,'id'|'created_at'|'issue'|'issues'> & {issues:{issue:string;lost_minutes:string}[]};
function today() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); }
const initial = (section:FinishingSection):Form => ({production_date:today(),section,machine:finishingMachines[section][0],shift:'Shift 1',production_quantity:0,unit:'Meter',machine_speed:0,issues:[{issue:finishingIssues[0],lost_minutes:''}],notes:''});
export default function FinishingInput({username,role,sections}:{username:string;role:string;sections:FinishingSection[]}) {
  const edit = useSearchParams().get('edit');
  const [form,setForm] = useState<Form>(()=>initial(sections[0]));
  const [loading,setLoading] = useState(!!edit);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  useEffect(()=>{
    if (!edit) return;
    let active=true;
    fetch(`/api/finishing?id=${encodeURIComponent(edit)}`,{cache:'no-store'}).then(async response=>{
      const body=await response.json(); if(!response.ok) throw Error(body.error||'Gagal membaca data.');
       if(active) setForm({production_date:body.data.production_date,section:body.data.section,machine:body.data.machine,shift:body.data.shift,production_quantity:body.data.production_quantity,unit:body.data.unit,machine_speed:body.data.machine_speed,issues:(body.data.issues?.length?body.data.issues:[{issue:body.data.issue,lost_minutes:null}]).map((row:{issue:string;lost_minutes:number|null})=>({issue:row.issue,lost_minutes:row.lost_minutes === null?'':String(row.lost_minutes)})),notes:body.data.notes});
    }).catch(error=>active&&setMessage(error.message)).finally(()=>active&&setLoading(false));
    return ()=>{active=false};
  },[edit]);
  function change<K extends keyof Form>(key:K,value:Form[K]) { setForm(old=>({...old,[key]:value})); }
  function updateIssue(index:number,change:Partial<Form['issues'][number]>) {setForm(old=>({...old,issues:old.issues.map((row,i)=>i===index?{...row,...change}:row)}));}
  async function save(event:FormEvent) {
    event.preventDefault(); setBusy(true);setMessage('');
    try {
      if(form.issues.reduce((sum,row)=>sum+Number(row.lost_minutes || 0),0)>1440) throw Error('Total downtime tidak boleh lebih dari 1.440 menit.');
      const data={...form,issues:form.issues.map(row=>({issue:row.issue,lost_minutes:row.lost_minutes===''?null:Number(row.lost_minutes)}))};
      const response=await fetch('/api/finishing',{method:edit?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(edit?{id:edit,data}:data)});
      const body=await response.json();if(!response.ok) throw Error(body.error||'Gagal menyimpan.');
      if(edit) location.assign('/finishing/recap');
      else {setMessage('Data finishing berhasil disimpan.');setForm(initial(sections[0]));}
    } catch(error) {setMessage(error instanceof Error?error.message:'Gagal menyimpan.');}
    finally {setBusy(false);}
  }
  return <AppShell username={username} role={role}>
    <div className="page-heading"><small>FINISHING · PRODUKSI</small><h1>{edit?'Edit Produksi Finishing':'Input Produksi Finishing'}</h1><p>Catat produksi setiap bagian, mesin, dan shift.</p></div>
    <section className="panel"><h2>Data Produksi</h2>{loading?<p>Memuat data…</p>:<form onSubmit={save}>
      <div className="grid">
        <label>Tanggal<input type="date" required value={form.production_date} onChange={e=>change('production_date',e.target.value)}/></label>
        <label>Bagian<select required value={form.section} onChange={e=>{const section=e.target.value as FinishingSection;setForm(old=>({...old,section,machine:finishingMachines[section][0]}));}}>{sections.map(section=><option key={section}>{section}</option>)}</select></label>
        <label>Mesin<select required value={form.machine} onChange={e=>change('machine',e.target.value)}>{finishingMachines[form.section].map(machine=><option key={machine}>{machine}</option>)}</select></label>
        <label>Shift<select required value={form.shift} onChange={e=>change('shift',e.target.value)}>{finishingShifts.map(shift=><option key={shift}>{shift}</option>)}</select></label>
        <label>Jumlah Produksi<input type="number" min="0" max="1000000000" step="any" required value={form.production_quantity} onChange={e=>change('production_quantity',e.target.value as unknown as number)}/></label>
        <label>Satuan<select required value={form.unit} onChange={e=>change('unit',e.target.value)}>{finishingUnits.map(unit=><option key={unit}>{unit}</option>)}</select></label>
        <label>Kecepatan Mesin<input type="number" min="0" max="1000000000" step="any" required value={form.machine_speed} onChange={e=>change('machine_speed',e.target.value as unknown as number)}/></label>
       </div>
       <h2 style={{marginTop:24}}>Daftar Downtime / Kendala</h2>
       {form.issues.map((row,index)=><div className="grid" key={index} style={{marginBottom:14,alignItems:'end'}}>
         <label>Downtime {index+1} (menit, opsional)<input type="number" min="0" max="1440" step="1" value={row.lost_minutes} onChange={e=>updateIssue(index,{lost_minutes:e.target.value})}/></label>
         <label>Kendala {index+1}<select required value={row.issue} onChange={e=>updateIssue(index,{issue:e.target.value})}>{finishingIssues.map(issue=><option key={issue}>{issue}</option>)}</select></label>
         <button type="button" disabled={form.issues.length===1} onClick={()=>setForm(old=>({...old,issues:old.issues.filter((_,i)=>i!==index)}))} aria-label={`Hapus kendala ${index+1}`} style={{width:'fit-content',padding:'7px 12px',justifySelf:'start'}}>Hapus</button>
       </div>)}
       <button type="button" disabled={form.issues.length>=30} onClick={()=>setForm(old=>({...old,issues:[...old.issues,{issue:finishingIssues[0],lost_minutes:''}]}))}>+ Tambah Kendala</button>
       <label style={{marginTop:18}}>Keterangan (opsional)<textarea maxLength={1000} rows={3} value={form.notes} onChange={e=>change('notes',e.target.value)}/></label>
      <div className="row-actions"><button className="primary" disabled={busy}>{busy?'Menyimpan…':edit?'Simpan Perubahan':'Simpan Data'}</button><a className="link-button" href="/finishing/recap">Lihat Rekap</a></div>
    </form>}{message&&<p role="status" className="status">{message}</p>}</section>
  </AppShell>;
}
