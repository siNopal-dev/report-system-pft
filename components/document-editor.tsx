'use client';

import { useEffect, useRef, useState } from 'react';
import { documentCanvas } from '../lib/ocr';
import { rectify, type Point } from '../lib/perspective';
import { detectPaper } from '../lib/auto-corners';

const initial: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

type DocumentEditorProps = {
  file: File;
  disabled: boolean;
  onReady: (canvas: HTMLCanvasElement | null) => void;
  onStatus: (message: string) => void;
};

export default function DocumentEditor({
  file,
  disabled,
  onReady,
  onStatus,
}: DocumentEditorProps) {
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState('');
  const [points, setPoints] = useState<Point[]>(initial);
  const [result, setResult] = useState('');
  const [working, setWorking] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    onReady(null);
    setSource(null);
    setResult('');
    setUrl('');
    setPoints(initial);

    documentCanvas(file)
      .then((canvas) => {
        if (!active) return;

        setSource(canvas);
        setUrl(canvas.toDataURL('image/jpeg', 0.9));

        const found = detectPaper(canvas);
        const chosen = found || initial;
        setPoints(chosen);

        rectify(canvas, chosen)
          .then((output) => {
            if (!active) return;

            setResult(output.toDataURL('image/jpeg', 0.86));
            onReady(output);
            onStatus(
              found
                ? 'Sudut kertas terdeteksi otomatis. Periksa dan koreksi jika perlu.'
                : 'Batas kertas tidak terdeteksi; halaman penuh digunakan. Periksa sudutnya.',
            );
          })
          .catch((error) => {
            if (active) onStatus(String(error));
          });
      })
      .catch((error) => {
        if (active) onStatus(String(error));
      });

    return () => {
      active = false;
    };
  }, [file]);

  function update(index: number, point: Point) {
    setPoints((old) => old.map((item, i) => (i === index ? point : item)));
    setResult('');
    onReady(null);
  }

  async function apply() {
    if (!source) return;

    setWorking(true);
    onStatus('Meluruskan dokumen…');

    try {
      const canvas = await rectify(source, points);
      setResult(canvas.toDataURL('image/jpeg', 0.9));
      onReady(canvas);
      onStatus('Dokumen diluruskan. Periksa pratinjau, lalu jalankan OCR.');
    } catch (error) {
      onStatus(String(error));
    } finally {
      setWorking(false);
    }
  }

  function rotate() {
    if (!source) return;

    const canvas = document.createElement('canvas');
    canvas.width = source.height;
    canvas.height = source.width;

    const context = canvas.getContext('2d')!;
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(source, 0, 0);

    setSource(canvas);
    setUrl(canvas.toDataURL('image/jpeg', 0.9));
    setPoints(initial);
    setResult('');
    onReady(null);
  }

  function detectAgain() {
    if (!source) return;

    const found = detectPaper(source);

    if (found) {
      setPoints(found);
      setResult('');
      onReady(null);
      onStatus('Sudut ditemukan. Periksa posisi titik, lalu terapkan.');
    } else {
      onStatus('Batas kertas tidak terdeteksi. Atur titik secara manual.');
    }
  }

  function move(event: React.PointerEvent<SVGSVGElement>) {
    if (drag.current === null || disabled || working) return;

    const rect = svg.current!.getBoundingClientRect();

    update(drag.current, {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01((event.clientY - rect.top) / rect.height),
    });
  }

  function moveWithKeyboard(index: number, point: Point, event: React.KeyboardEvent) {
    if (disabled || working || !event.key.startsWith('Arrow')) return;

    event.preventDefault();

    const dx =
      event.key === 'ArrowRight' ? 0.005 : event.key === 'ArrowLeft' ? -0.005 : 0;
    const dy =
      event.key === 'ArrowDown' ? 0.005 : event.key === 'ArrowUp' ? -0.005 : 0;

    update(index, {
      x: clamp01(point.x + dx),
      y: clamp01(point.y + dy),
    });
  }

  return (
    <div className="scan-editor">
      <p>
        Sudut kertas dan pratinjau disiapkan otomatis. Jika meleset, geser titik
        lalu klik Terapkan sudut kertas.
      </p>

      {url && (
        <svg
          ref={svg}
          viewBox={`0 0 ${source!.width} ${source!.height}`}
          style={{
            aspectRatio: `${source!.width}/${source!.height}`,
            touchAction: 'none',
            width: '100%',
          }}
          onPointerMove={move}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <image
            href={url}
            width={source!.width}
            height={source!.height}
            preserveAspectRatio="none"
          />

          <polygon
            points={points
              .map((point) => `${point.x * source!.width},${point.y * source!.height}`)
              .join(' ')}
            fill="#2563eb22"
            stroke="#2563eb"
            strokeWidth="4"
          />

          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x * source!.width}
              cy={point.y * source!.height}
              r={Math.max(9, Math.min(source!.width, source!.height) * 0.014)}
              fill="#2563eb"
              stroke="white"
              strokeWidth="4"
              tabIndex={0}
              role="slider"
              aria-label={`Sudut ${index + 1}, gunakan tombol panah`}
              aria-valuetext={`${Math.round(point.x * 100)}%, ${Math.round(point.y * 100)}%`}
              onKeyDown={(event) => moveWithKeyboard(index, point, event)}
              onPointerDown={(event) => {
                if (disabled || working) return;
                drag.current = index;
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
            />
          ))}
        </svg>
      )}

      <div className="actions">
        <button disabled={!source || disabled || working} onClick={rotate}>
          Putar 90°
        </button>
        <button disabled={!source || disabled || working} onClick={detectAgain}>
          Deteksi ulang sudut
        </button>
        <button disabled={!source || disabled || working} onClick={apply}>
          {working ? 'Meluruskan…' : 'Terapkan sudut kertas'}
        </button>
      </div>

      {result && (
        <>
          <p>Pratinjau hasil pelurusan — gambar ini yang dibaca OCR.</p>
          <img src={result} alt="Hasil koreksi perspektif" />
        </>
      )}
    </div>
  );
}
