'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from './app-shell';

type IssueEntry = {
  issue: string;
  lost_minutes: number;
};

type LostTimeRow = {
  id: string;
  production_date: string;
  shift: string;
  mc_flat: string;
  production_meters: number;
  lost_minutes: number;
  issues: IssueEntry[];
  notes: string;
};

type Filter = {
  from: string;
  to: string;
  machine: string;
};

type PrintingRecapProps = {
  username: string;
  role: string;
};

export default function PrintingRecap({ username, role }: PrintingRecapProps) {
  const [rows, setRows] = useState<LostTimeRow[]>([]);
  const [filter, setFilter] = useState<Filter>({ from: '', to: '', machine: '' });
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/printing/lost-time', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);
      setRows(body.data);
      setMessage('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Gagal memuat data.',
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!filter.from || row.production_date >= filter.from) &&
          (!filter.to || row.production_date <= filter.to) &&
          (!filter.machine || row.mc_flat === filter.machine),
      ),
    [rows, filter],
  );

  const meters = filtered.reduce(
    (sum, row) => sum + Number(row.production_meters),
    0,
  );
  const minutes = filtered.reduce(
    (sum, row) => sum + Number(row.lost_minutes),
    0,
  );

  const metrics: [string, string][] = [
    ['Total Catatan', filtered.length.toLocaleString('id-ID')],
    ['Jumlah Produksi', `${meters.toLocaleString('id-ID')} m`],
    ['Lost Time', `${minutes.toLocaleString('id-ID')} menit`],
  ];

  return (
    <AppShell username={username} role={role}>
      <div className="page-heading">
        <small>PRINTING · PRODUKSI</small>
        <h1>Rekap Lost Time</h1>
        <p>Lihat catatan dan total lost time sesuai tanggal dan mesin.</p>
      </div>

      <div className="dash-metrics">
        {metrics.map(([label, value]) => (
          <div className="grand" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="panel">
        <h2>Filter Rekap</h2>
        <div className="grid">
          <label>
            Dari Tanggal
            <input
              type="date"
              value={filter.from}
              onChange={(event) => setFilter({ ...filter, from: event.target.value })}
            />
          </label>

          <label>
            Sampai Tanggal
            <input
              type="date"
              value={filter.to}
              onChange={(event) => setFilter({ ...filter, to: event.target.value })}
            />
          </label>

          <label>
            MC Flat
            <select
              value={filter.machine}
              onChange={(event) =>
                setFilter({ ...filter, machine: event.target.value })
              }
            >
              <option value="">Semua Mesin</option>
              {['F1', 'F2', 'F3'].map((machine) => (
                <option key={machine}>{machine}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Daftar Lost Time</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={() => void load()}>Muat Ulang</button>
            <button onClick={() => location.assign('/printing')}>
              Tambah Data
            </button>
          </div>
        </div>

        <div className="table">
          <table>
            <thead>
              <tr>
                {[
                  'Tanggal',
                  'Shift',
                  'MC Flat',
                  'Produksi (m)',
                  'Lost Time (menit)',
                  'Kendala',
                  'Keterangan',
                ].map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.production_date}</td>
                  <td>{row.shift}</td>
                  <td>{row.mc_flat}</td>
                  <td>{Number(row.production_meters).toLocaleString('id-ID')}</td>
                  <td>{row.lost_minutes}</td>
                  <td>
                    {row.issues.map((entry, index) => (
                      <div key={index}>
                        {index + 1}. {entry.issue} — {entry.lost_minutes} menit
                      </div>
                    ))}
                  </td>
                  <td>{row.notes || '—'}</td>
                </tr>
              ))}
            </tbody>

            <tfoot>
              <tr>
                <th colSpan={3} scope="row">
                  Total
                </th>
                <td>
                  <strong>{meters.toLocaleString('id-ID')} m</strong>
                </td>
                <td>
                  <strong>{minutes.toLocaleString('id-ID')} menit</strong>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>

          {!filtered.length && (
            <p className="empty">Belum ada catatan untuk filter ini.</p>
          )}
        </div>
      </section>

      {message && (
        <div role="status" className="status">
          {message}
        </div>
      )}
    </AppShell>
  );
}
