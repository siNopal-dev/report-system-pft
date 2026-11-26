'use client';

import { useEffect, useRef } from 'react';
import { fields, total } from '../lib/template-fa.mjs';

type RecipeDetailProps = {
  record: any;
  onClose: () => void;
  onDownload: (data: any) => void;
  onEdit: (record: any) => void;
  onDelete: (record: any) => void;
  busy: boolean;
};

export default function RecipeDetail({
  record,
  onClose,
  onDownload,
  onEdit,
  onDelete,
  busy,
}: RecipeDetailProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const data = record.data;

  useEffect(() => {
    const focus = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;

    ref.current?.showModal();
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = oldOverflow;
      focus?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="recipe-dialog"
      aria-labelledby="recipe-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <article>
        <div className="section-head">
          <h2 id="recipe-title">Resep {record.recipe_number}</h2>
          <button onClick={onClose} aria-label="Tutup detail resep" autoFocus>
            ×
          </button>
        </div>

        <p>
          Disimpan {new Date(record.created_at).toLocaleString('id-ID')}
        </p>

        <div className="grid">
          {Object.entries(fields).map(([key, label]) => (
            <div key={key}>
              <small>{String(label)}</small>
              <p>
                <strong>{data.identity[key] || '—'}</strong>
              </p>
            </div>
          ))}
        </div>

        {['lusi', 'pakan'].map((side) => (
          <section key={side}>
            <h3>Kebutuhan benang {side}</h3>

            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>Nomor benang</th>
                    <th>Warna</th>
                    <th>KG</th>
                  </tr>
                </thead>

                <tbody>
                  {data[side].map((row: any, index: number) => (
                    <tr key={index}>
                      <td>{row.yarn}</td>
                      <td>{row.color}</td>
                      <td>{row.kg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p>
              Total: <strong>{total(data[side]).toLocaleString('id-ID')} kg</strong>{' '}
              · Total tercetak: {data.printed?.[side] ?? '—'}
            </p>
          </section>
        ))}

        <div className="grand">
          Total kebutuhan
          <strong>
            {(total(data.lusi) + total(data.pakan)).toLocaleString('id-ID')} kg
          </strong>
        </div>

        <h3>Catatan pemeriksaan</h3>
        <p style={{ whiteSpace: 'pre-wrap' }}>
          {data.notes || 'Tidak ada catatan.'}
        </p>

        <div className="actions">
          <button className="primary" onClick={() => onDownload(data)}>
            Unduh Excel
          </button>
          <button disabled={busy} onClick={() => onEdit(record)}>
            Edit resep
          </button>
          <button
            className="delete-recipe"
            disabled={busy}
            onClick={() => onDelete(record)}
          >
            Hapus resep
          </button>
        </div>
      </article>
    </dialog>
  );
}
