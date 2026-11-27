'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from './app-shell';

type IssueEntry = { issue: string; lost_minutes: number | null };
type PrintingRow = {
  id: string; production_date: string; shift: string; mc_flat: string;
  production_quantity: number; unit: 'Meter' | 'Kodi'; lost_minutes: number;
  issues: IssueEntry[]; notes: string;
};
type Filter = { from: string; to: string; machine: string; unit: string };
const fmt = (value: number) => Number(value).toLocaleString('id-ID', { maximumFractionDigits: 3 });

export default function PrintingRecap({ username, role }: { username: string; role: string }) {
  const [rows, setRows] = useState<PrintingRow[]>([]);
  const [filter, setFilter] = useState<Filter>({ from: '', to: '', machine: '', unit: '' });
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/printing/production', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || 'Gagal memuat data.');
      setRows(body.data);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal memuat data.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function remove(row: PrintingRow) {
    if (!window.confirm(`Hapus produksi ${row.mc_flat} tanggal ${row.production_date}?`)) return;
    setDeleting(row.id);
    setMessage('');
    try {
      const response = await fetch(`/api/printing/production?id=${encodeURIComponent(row.id)}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw Error(body.error || 'Gagal menghapus data.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menghapus data.');
    } finally { setDeleting(null); }
  }

  const filtered = useMemo(() => rows.filter(row =>
    (!filter.from || row.production_date >= filter.from) &&
    (!filter.to || row.production_date <= filter.to) &&
    (!filter.machine || row.mc_flat === filter.machine) &&
    (!filter.unit || row.unit === filter.unit)
  ), [rows, filter]);
  const meters = filtered.filter(row => row.unit === 'Meter').reduce((sum, row) => sum + Number(row.production_quantity), 0);
  const kodi = filtered.filter(row => row.unit === 'Kodi').reduce((sum, row) => sum + Number(row.production_quantity), 0);
  const minutes = filtered.reduce((sum, row) => sum + Number(row.lost_minutes), 0);
  const metrics: [string, string][] = [
    ['Jumlah Input', fmt(filtered.length)], ['Total Meter', `${fmt(meters)} meter`],
    ['Total Kodi', `${fmt(kodi)} kodi`], ['Total Downtime', `${fmt(minutes)} menit`],
  ];

  return <AppShell username={username} role={role}>
    <div className="page-heading"><small>PRINTING · PRODUKSI</small><h1>Rekap Produksi Printing</h1><p>Lihat produksi dan downtime berdasarkan tanggal, mesin, serta satuan.</p></div>
    <div className="dash-metrics">{metrics.map(([label,value]) => <div className="grand" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="panel"><h2>Filter Rekap</h2><div className="grid">
      <label>Dari Tanggal<input type="date" value={filter.from} onChange={event => setFilter({ ...filter, from: event.target.value })}/></label>
      <label>Sampai Tanggal<input type="date" value={filter.to} onChange={event => setFilter({ ...filter, to: event.target.value })}/></label>
      <label>MC Flat<select value={filter.machine} onChange={event => setFilter({ ...filter, machine: event.target.value })}><option value="">Semua Mesin</option>{['F1','F2','F3'].map(machine => <option key={machine}>{machine}</option>)}</select></label>
      <label>Satuan<select value={filter.unit} onChange={event => setFilter({ ...filter, unit: event.target.value })}><option value="">Semua Satuan</option><option>Meter</option><option>Kodi</option></select></label>
    </div></section>
    <section className="panel"><div className="section-head"><h2>Daftar Produksi</h2><div className="row-actions"><button onClick={() => void load()}>Muat Ulang</button><button onClick={() => location.assign('/printing')}>Tambah Data</button></div></div>
      <div className="table"><table><thead><tr>{['Tanggal','Shift','MC Flat','Jumlah Produksi','Satuan','Downtime (menit)','Kendala','Keterangan','Aksi'].map(header => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{filtered.map(row => <tr key={row.id}><td>{row.production_date}</td><td>{row.shift}</td><td>{row.mc_flat}</td><td>{fmt(row.production_quantity)}</td><td>{row.unit}</td><td>{fmt(row.lost_minutes)}</td><td>{row.issues.map((entry,index) => <div key={index}>{index+1}. {entry.issue}{entry.lost_minutes === null ? '' : ` — ${entry.lost_minutes} menit`}</div>)}</td><td>{row.notes || '—'}</td><td><div className="row-actions"><a className="link-button" href={`/printing?edit=${encodeURIComponent(row.id)}`}>Edit</a><button className="delete-recipe" type="button" disabled={deleting !== null} onClick={() => void remove(row)}>{deleting === row.id ? 'Menghapus…' : 'Hapus'}</button></div></td></tr>)}</tbody>
        <tfoot><tr><th colSpan={3} scope="row">Total ({fmt(filtered.length)} input)</th><td><strong>{fmt(meters)} meter<br/>{fmt(kodi)} kodi</strong></td><td></td><td><strong>{fmt(minutes)} menit</strong></td><td colSpan={3}></td></tr></tfoot></table>
        {!filtered.length && <p className="empty">Belum ada catatan untuk filter ini.</p>}
      </div>
    </section>
    {message && <div role="status" className="status">{message}</div>}
  </AppShell>;
}
