'use client';

import { useState, type FormEvent } from 'react';
import AppShell from './app-shell';

const issues = [
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

type IssueRow = {
  issue: string;
  lost_minutes: string;
};

type LostTimeForm = {
  production_date: string;
  shift: string;
  mc_flat: string;
  production_meters: string;
  issues: IssueRow[];
  notes: string;
};

const initialForm = (): LostTimeForm => ({
  production_date: new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()),
  shift: 'Shift 1',
  mc_flat: 'F1',
  production_meters: '',
  issues: [{ issue: issues[0], lost_minutes: '' }],
  notes: '',
});

type PrintingInputProps = {
  username: string;
  role: string;
};

export default function PrintingInput({ username, role }: PrintingInputProps) {
  const [form, setForm] = useState<LostTimeForm>(initialForm);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  function updateIssue(index: number, change: Partial<IssueRow>) {
    setForm((current) => ({
      ...current,
      issues: current.issues.map((row, i) =>
        i === index ? { ...row, ...change } : row,
      ),
    }));
  }

  function addIssue() {
    setForm((current) => ({
      ...current,
      issues: [...current.issues, { issue: issues[0], lost_minutes: '' }],
    }));
  }

  function removeIssue(index: number) {
    setForm((current) => ({
      ...current,
      issues: current.issues.filter((_, i) => i !== index),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();

    if (form.issues.length === 0) {
      setMessage('Tambahkan minimal satu kendala.');
      return;
    }

    const totalMinutes = form.issues.reduce(
      (sum, row) => sum + Number(row.lost_minutes),
      0,
    );

    if (totalMinutes > 1440) {
      setMessage('Total Lost Time tidak boleh lebih dari 1.440 menit per hari.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const response = await fetch('/api/printing/lost-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.error);

      setForm(initialForm());
      setMessage('Data lost time berhasil disimpan.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Gagal menyimpan.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell username={username} role={role}>
      <div className="page-heading">
        <small>PRINTING · PRODUKSI</small>
        <h1>Pencatatan Lost Time</h1>
        <p>Catat produksi dan waktu berhenti mesin flat.</p>
      </div>

      <section className="panel">
        <h2>Input Lost Time</h2>
        <form onSubmit={save}>
          <div className="grid">
            <label>
              Tanggal
              <input
                type="date"
                required
                value={form.production_date}
                onChange={(event) =>
                  setForm({ ...form, production_date: event.target.value })
                }
              />
            </label>

            <label>
              Shift
              <select
                value={form.shift}
                onChange={(event) => setForm({ ...form, shift: event.target.value })}
              >
                {['Shift 1', 'Shift 2', 'Shift 3'].map((shift) => (
                  <option key={shift}>{shift}</option>
                ))}
              </select>
            </label>

            <label>
              MC Flat
              <select
                value={form.mc_flat}
                onChange={(event) => setForm({ ...form, mc_flat: event.target.value })}
              >
                {['F1', 'F2', 'F3'].map((machine) => (
                  <option key={machine}>{machine}</option>
                ))}
              </select>
            </label>

            <label>
              Jumlah Produksi (Meter)
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.production_meters}
                onChange={(event) =>
                  setForm({ ...form, production_meters: event.target.value })
                }
              />
            </label>
          </div>

          <h2 style={{ marginTop: 24 }}>Daftar Kendala</h2>

          {form.issues.map((row, index) => (
            <div
              className="grid"
              key={index}
              style={{ marginBottom: 14, alignItems: 'end' }}
            >
              <label>
                Lost Time {index + 1} (menit)
                <input
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  required
                  value={row.lost_minutes}
                  onChange={(event) =>
                    updateIssue(index, { lost_minutes: event.target.value })
                  }
                />
              </label>

              <label>
                Kendala {index + 1}
                <select
                  value={row.issue}
                  onChange={(event) =>
                    updateIssue(index, { issue: event.target.value })
                  }
                >
                  {issues.map((issue) => (
                    <option key={issue}>{issue}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={form.issues.length === 1}
                onClick={() => removeIssue(index)}
                aria-label={`Hapus kendala ${index + 1}`}
                style={{ width: 'fit-content', padding: '7px 12px', justifySelf: 'start' }}
              >
                Hapus
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addIssue}
            disabled={form.issues.length >= 30}
          >
            + Tambah Kendala
          </button>

          <label style={{ marginTop: 18 }}>
            Keterangan (opsional)
            <textarea
              value={form.notes}
              maxLength={1000}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>

          <div className="actions">
            <button className="primary" disabled={busy}>
              {busy ? 'Menyimpan…' : 'Simpan Data'}
            </button>
            <button type="button" onClick={() => location.assign('/printing/recap')}>
              Lihat Rekap Lost Time
            </button>
          </div>
        </form>
      </section>

      {message && (
        <div role="status" className="status">
          {message}
        </div>
      )}
    </AppShell>
  );
}
