'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from './app-shell';
import RecipeDetail from './recipe-detail';
import { downloadArchive, downloadRecipe } from '../lib/excel';

type RecordItem = {
  id: string;
  recipe_number: string;
  created_at: string;
  data: any;
};

type RecipeArchiveProps = {
  username: string;
  role: string;
};

export default function RecipeArchive({ username, role }: RecipeArchiveProps) {
  const [history, setHistory] = useState<RecordItem[]>([]);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setBusy(true);

    try {
      const response = await fetch('/api/recipes', { cache: 'no-store' });

      if (response.status === 401) {
        location.assign('/login');
        return;
      }

      const result = await response.json();
      if (!response.ok) throw Error(result.error);

      setHistory(result.data || []);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function exportAll() {
    setBusy(true);

    try {
      const response = await fetch('/api/recipes?all=1', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);

      if (!result.data?.length) {
        setStatus('Arsip resep masih kosong.');
        return;
      }

      await downloadArchive(result.data);
      setStatus(`${result.data.length} resep berhasil diunduh.`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(record: RecordItem) {
    if (
      !confirm(
        `Hapus resep ${record.recipe_number} secara permanen? Tindakan ini tidak dapat dibatalkan.`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/recipes/${record.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error);

      setSelected(null);
      setHistory((old) => old.filter((item) => item.id !== record.id));
      setStatus(`Resep ${record.recipe_number} berhasil dihapus.`);
    } catch (error) {
      setStatus(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell username={username} role={role}>
      <div className="page-heading">
        <small>PRODUCTION PLANNING & CONTROL</small>
        <h1>Arsip Resep FA</h1>
        <p>Periksa, unduh, edit, atau hapus resep yang telah tersimpan.</p>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Arsip resep</h2>
          <div className="actions">
            <button disabled={busy} onClick={load}>
              Muat 50 terbaru
            </button>
            <button disabled={busy} onClick={exportAll}>
              Unduh semua resep (Excel)
            </button>
          </div>
        </div>

        {history.map((record) => (
          <button
            className="archive"
            key={record.id}
            onClick={() => setSelected(record)}
          >
            {record.recipe_number} —{' '}
            {new Date(record.created_at).toLocaleDateString('id-ID')}
          </button>
        ))}

        {!history.length && <p className="empty">Belum ada resep tersimpan.</p>}
      </section>

      {selected && (
        <RecipeDetail
          record={selected}
          onClose={() => setSelected(null)}
          onDownload={async (data) => {
            try {
              await downloadRecipe(data);
            } catch (error) {
              setStatus(String(error));
            }
          }}
          onEdit={(record) =>
            location.assign(`/?edit=${encodeURIComponent(record.id)}`)
          }
          onDelete={remove}
          busy={busy}
        />
      )}

      <div role="status" aria-live="polite" className="status">
        {status}
      </div>
    </AppShell>
  );
}
