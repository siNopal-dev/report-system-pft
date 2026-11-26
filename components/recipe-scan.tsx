'use client';

import { useEffect, useState } from 'react';
import { blank, fields, templates, total, number } from '../lib/template-fa.mjs';
import { readDocument } from '../lib/ocr';
import { downloadRecipe } from '../lib/excel';
import AppShell from './app-shell';
import Camera from './camera';
import DocumentEditor from './document-editor';

type Row = {
  yarn: string;
  color: string;
  kg: string;
};

type Recipe = {
  identity: Record<string, string>;
  lusi: Row[];
  pakan: Row[];
  printed: {
    lusi: number | null;
    pakan: number | null;
  };
  notes: string;
};

type RecipeScanProps = {
  username: string;
  role: string;
  editId: string | null;
};

const fieldOrder = ['X', 'Y', 'lebar', 'tinggi'];

export default function RecipeScan({ username, role, editId }: RecipeScanProps) {
  const [data, setData] = useState<Recipe>(blank);
  const [file, setFile] = useState<File | null>(null);
  const [prepared, setPrepared] = useState<HTMLCanvasElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('Siap membaca resep');
  const [reviewed, setReviewed] = useState(false);
  const [raw, setRaw] = useState('');
  const [regions, setRegions] = useState<Record<string, number[]>>(
    templates['fa-palekat-v1'].regions,
  );

  useEffect(() => {
    if (!editId) return;

    let active = true;

    fetch('/api/recipes?all=1', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw Error(result.error);

        const record = result.data.find(
          (item: { id: string }) => item.id === editId,
        );
        if (!record) throw Error('Arsip resep tidak ditemukan.');

        if (active) {
          setData(record.data);
          setStatus(
            `Mengedit resep ${record.recipe_number}. Periksa perubahan sebelum menyimpan.`,
          );
        }
      })
      .catch((error) => {
        if (active) setStatus(String(error));
      });

    return () => {
      active = false;
    };
  }, [editId]);

  function edit(value: Recipe) {
    setData(value);
    setReviewed(false);
  }

  async function scan() {
    if (!file || !prepared) return;

    const hasData =
      data.identity.kode ||
      data.identity.resep ||
      data.lusi.length ||
      data.pakan.length;

    if (hasData && !confirm('Hasil OCR akan mengganti isian formulir. Lanjutkan?')) {
      return;
    }

    setBusy(true);

    try {
      const copy = document.createElement('canvas');
      copy.width = prepared.width;
      copy.height = prepared.height;
      copy.getContext('2d')!.drawImage(prepared, 0, 0);

      const result = await readDocument(file, regions, setStatus, copy);

      edit(result.data);
      setRaw(JSON.stringify(result.parts, null, 2));
      setStatus('Pembacaan selesai. Periksa semua kolom dan peringatan total.');
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    const invalidRow = [...data.lusi, ...data.pakan].some(
      (row) =>
        !row.yarn.trim() ||
        !row.color.trim() ||
        !Number.isFinite(number(row.kg)) ||
        number(row.kg) <= 0,
    );

    if (
      !reviewed ||
      !data.identity.resep.trim() ||
      !data.identity.kode.trim() ||
      !data.lusi.length ||
      !data.pakan.length ||
      invalidRow
    ) {
      setStatus(
        'Isi kode, nomor resep, dan seluruh rincian lusi/pakan dengan KG positif, lalu konfirmasi pemeriksaan.',
      );
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(editId ? `/api/recipes/${editId}` : '/api/recipes', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_name: file?.name || null, data }),
      });

      if (response.status === 401) {
        location.assign('/login');
        return;
      }

      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Gagal menyimpan data');

      location.assign('/recipes/archive');
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function exportData() {
    try {
      await downloadRecipe(data);
    } catch (error) {
      setStatus('Gagal membuat Excel: ' + String(error));
    }
  }

  function selectFile(selected: File | null) {
    if (!selected) return;

    if (selected.size > 15 * 1024 * 1024) {
      setStatus('Batas ukuran 15 MB');
      return;
    }

    setPrepared(null);
    setFile(selected);
    setStatus('Dokumen dipilih. Jalankan OCR untuk memperbarui isian.');
  }

  function updateRegion(name: string, values: number[], index: number, value: number) {
    const next = [...values];
    next[index] = value;

    const insideBounds =
      next[0] + next[2] <= 1 && next[1] + next[3] <= 1 && next[2] > 0 && next[3] > 0;

    if (insideBounds) setRegions({ ...regions, [name]: next });
  }

  const sides = ['lusi', 'pakan'] as const;

  return (
    <AppShell username={username} role={role}>
      <div className="page-heading">
        <small>PRODUCTION PLANNING & CONTROL</small>
        <h1>{editId ? 'Edit Resep FA' : 'Scan & Pembacaan Resep FA'}</h1>
        <p>
          Unggah resep, baca otomatis, koreksi data, dan simpan kebutuhan benang.
        </p>
      </div>

      <div className="workspace">
        <section className="panel document">
          <h2>1. Dokumen Resep</h2>
          <p>
            PDF satu halaman atau foto halaman penuh, tegak, dan jelas. Maksimal 15
            MB.
          </p>

          <label className="upload">
            Pilih dokumen
            <input
              disabled={busy}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Camera
            disabled={busy}
            onCapture={(captured) => {
              setPrepared(null);
              setFile(captured);
            }}
            onStatus={setStatus}
          />

          {file && (
            <DocumentEditor
              file={file}
              disabled={busy}
              onReady={setPrepared}
              onStatus={setStatus}
            />
          )}

          <button
            className="primary"
            disabled={!file || !prepared || busy}
            onClick={scan}
          >
            {busy ? 'Sedang diproses…' : 'Baca dokumen dengan OCR'}
          </button>

          <details>
            <summary>Pengaturan lanjutan area template</summary>
            <p>Proporsi halaman: X, Y, lebar, tinggi (0–1).</p>

            {Object.entries(regions).map(([name, values]) => (
              <label key={name}>
                {name}
                <div className="region">
                  {values.map((value, index) => (
                    <input
                      key={index}
                      aria-label={`${name} ${fieldOrder[index]}`}
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={value}
                      onChange={(event) =>
                        updateRegion(name, values, index, Number(event.target.value))
                      }
                    />
                  ))}
                </div>
              </label>
            ))}
          </details>

          <details>
            <summary>Hasil Pembacaan OCR</summary>
            <p>Periksa teks sumber untuk bagian yang belum terbaca.</p>
            <pre>{raw || 'Belum ada hasil.'}</pre>
          </details>
        </section>

        <div>
          <section className="panel">
            {editId && (
              <div className="edit-banner">
                Mengedit arsip resep {data.identity.resep}.{' '}
                <a href="/recipes/archive">Batal edit</a>
              </div>
            )}

            <h2>2. Identitas Produk</h2>

            <div className="grid">
              {Object.entries(fields).map(([key, label]) => (
                <label key={key}>
                  {String(label)}
                  <input
                    disabled={busy}
                    value={data.identity[key] || ''}
                    onChange={(event) =>
                      edit({
                        ...data,
                        identity: { ...data.identity, [key]: event.target.value },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          {sides.map((side) => (
            <section className="panel" key={side}>
              <div className="section-head">
                <h2>
                  {side === 'lusi'
                    ? '3. Kebutuhan Benang Lusi'
                    : '4. Kebutuhan Benang Pakan'}
                </h2>
                <button
                  disabled={busy}
                  onClick={() =>
                    edit({
                      ...data,
                      [side]: [...data[side], { yarn: '', color: '', kg: '' }],
                    })
                  }
                >
                  + Tambah baris
                </button>
              </div>

              <div className="table">
                <table>
                  <thead>
                    <tr>
                      <th>Nomor benang</th>
                      <th>Warna</th>
                      <th>KG</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {data[side].map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {(['yarn', 'color', 'kg'] as const).map((key) => (
                          <td key={key}>
                            <input
                              disabled={busy}
                              aria-label={`${side} ${rowIndex + 1} ${key}`}
                              value={row[key]}
                              onChange={(event) =>
                                edit({
                                  ...data,
                                  [side]: data[side].map((item, index) =>
                                    index === rowIndex
                                      ? { ...item, [key]: event.target.value }
                                      : item,
                                  ),
                                })
                              }
                            />
                          </td>
                        ))}
                        <td>
                          <button
                            disabled={busy}
                            aria-label={`Hapus ${side} ${rowIndex + 1}`}
                            onClick={() =>
                              edit({
                                ...data,
                                [side]: data[side].filter(
                                  (_, index) => index !== rowIndex,
                                ),
                              })
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!data[side].length && (
                  <p className="empty">
                    Belum ada rincian. Baca dokumen atau tambahkan baris.
                  </p>
                )}
              </div>

              <div className="subtotal">
                Total {side}
                <strong>
                  {total(data[side]).toLocaleString('id-ID', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  kg
                </strong>
              </div>

              <label>
                Total tercetak pada dokumen (opsional)
                <input
                  disabled={busy}
                  type="number"
                  step="0.01"
                  value={data.printed[side] ?? ''}
                  onChange={(event) =>
                    edit({
                      ...data,
                      printed: {
                        ...data.printed,
                        [side]:
                          event.target.value === ''
                            ? null
                            : Number(event.target.value),
                      },
                    })
                  }
                />
              </label>

              {data.printed[side] !== null &&
                Math.abs(total(data[side]) - data.printed[side]!) > 0.005 && (
                  <p className="warning">
                    Total rincian berbeda dari total tercetak {data.printed[side]} kg.
                    Periksa dokumen dan catat penyebab selisih.
                  </p>
                )}
            </section>
          ))}

          <section className="panel">
            <h2>5. Rekap Kebutuhan Benang</h2>

            <div className="recap">
              {sides.map((side) => (
                <div className="grand" key={side}>
                  Total {side}
                  <strong>
                    {total(data[side]).toLocaleString('id-ID', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    kg
                  </strong>
                </div>
              ))}
            </div>

            <div className="grand">
              Total kebutuhan
              <strong>
                {(total(data.lusi) + total(data.pakan)).toLocaleString('id-ID', {
                  minimumFractionDigits: 2,
                })}{' '}
                kg
              </strong>
            </div>

            <label>
              Catatan pemeriksaan
              <textarea
                disabled={busy}
                value={data.notes}
                onChange={(event) => edit({ ...data, notes: event.target.value })}
              />
            </label>

            <label className="check">
              <input
                type="checkbox"
                disabled={busy}
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              Saya sudah memeriksa identitas, nomor benang, warna, KG, dan selisih
              total.
            </label>

            <div className="actions">
              <button className="primary" disabled={busy || !reviewed} onClick={save}>
                {editId ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
              <button disabled={busy} onClick={exportData}>
                Unduh Excel
              </button>
              <button onClick={() => window.print()}>Cetak</button>
            </div>
          </section>

          <section className="panel">
            <a href="/recipes/archive">Buka Arsip Resep →</a>
          </section>
        </div>
      </div>

      <div role="status" aria-live="polite" className="status">
        {status}
      </div>
    </AppShell>
  );
}
