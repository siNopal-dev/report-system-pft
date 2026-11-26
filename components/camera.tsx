'use client';

import { useEffect, useRef, useState } from 'react';

type CameraProps = {
  disabled: boolean;
  onCapture: (file: File) => void;
  onStatus: (message: string) => void;
};

export default function Camera({ disabled, onCapture, onStatus }: CameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0);

  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);

  function stop() {
    generation.current++;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    setReady(false);
    setOpen(false);
    setStarting(false);
  }

  useEffect(
    () => () => {
      generation.current++;
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stop();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      onStatus(
        'Kamera memerlukan HTTPS atau localhost pada browser yang mendukung kamera.',
      );
      return;
    }

    const id = ++generation.current;
    setOpen(true);
    setStarting(true);
    setReady(false);

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 2560 },
          height: { ideal: 1920 },
        },
      });

      if (id !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }

      stream.current = media;

      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
    } catch (error) {
      if (id !== generation.current) return;

      stop();

      const name = (error as DOMException).name;
      onStatus(
        name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Izinkan kamera melalui ikon di bilah alamat.'
          : name === 'NotFoundError'
            ? 'Kamera tidak ditemukan. Sambungkan webcam atau gunakan unggah dokumen.'
            : 'Kamera tidak dapat dibuka. Tutup aplikasi lain yang sedang memakai kamera.',
      );
    } finally {
      if (id === generation.current) setStarting(false);
    }
  }

  function capture() {
    const element = video.current;
    if (!element || !element.videoWidth || !ready) return;

    const id = generation.current;
    const canvas = document.createElement('canvas');
    canvas.width = element.videoWidth;
    canvas.height = element.videoHeight;
    canvas.getContext('2d')!.drawImage(element, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (id !== generation.current) return;

        if (!blob) {
          onStatus('Pengambilan foto gagal. Coba lagi.');
          return;
        }

        onCapture(
          new File([blob], `resep-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        );
        stop();
        onStatus('Foto diambil. Pastikan tulisan jelas, lalu jalankan OCR.');
      },
      'image/jpeg',
      0.96,
    );
  }

  return (
    <>
      <button disabled={disabled || starting} onClick={start}>
        Buka Kamera / Ambil Foto
      </button>

      {open && (
        <div
          className="camera-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Ambil foto resep"
        >
          <div className="camera-box">
            <h2>Kamera dokumen</h2>
            <p>
              Posisikan seluruh kertas tegak, dekat, dan terang. Pastikan tulisan
              tajam sebelum mengambil foto.
            </p>

            <video
              ref={video}
              autoPlay
              playsInline
              muted
              onLoadedData={() => setReady(true)}
            />

            <div className="actions">
              <button
                className="primary"
                disabled={!ready || starting}
                onClick={capture}
              >
                Ambil Foto
              </button>
              <button onClick={stop}>Tutup Kamera</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
