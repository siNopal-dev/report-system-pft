import { createWorker, PSM } from 'tesseract.js';
import { reconcileReadings, tableLines } from './ocr-table.mjs';
import { templates } from './template-fa.mjs';

export async function readDocument(
  file: File,
  regions: Record<string, number[]>,
  progress: (message: string) => void,
  prepared?: HTMLCanvasElement,
) {
  const canvas = prepared || (await documentCanvas(file));

  const worker = await createWorker('ind+eng', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text') {
        progress('Membaca teks ' + Math.round(message.progress * 100) + '%');
      }
    },
  });

  const parts: Record<string, string> = {};

  try {
    for (const [name, box] of Object.entries(regions)) {
      progress('Membaca ' + name);

      const [x, y, width, height] = box;
      const crop = document.createElement('canvas');
      const boost = Math.max(1, 1600 / (canvas.width * width));

      crop.width = Math.round(canvas.width * width * boost);
      crop.height = Math.round(canvas.height * height * boost);

      crop.getContext('2d')!.drawImage(
        canvas,
        canvas.width * x,
        canvas.height * y,
        canvas.width * width,
        canvas.height * height,
        0,
        0,
        crop.width,
        crop.height,
      );

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
      });

      const first = (await worker.recognize(crop)).data.text;

      if (name === 'lusi' || name === 'pakan') {
        progress('Memeriksa baris tabel ' + name);

        const context = crop.getContext('2d')!;
        const pixels = context.getImageData(0, 0, crop.width, crop.height);
        const lines = tableLines(pixels.data, crop.width, crop.height);
        const rowTexts: string[] = [];

        // Read each detected table band from the original image, retaining decimal evidence.
        if (lines.bands.length >= 3 && lines.bands.length <= 30) {
          await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });

          for (const [top, bottom] of lines.bands) {
            const row = document.createElement('canvas');
            row.width = crop.width;
            row.height = bottom - top;

            row
              .getContext('2d')!
              .drawImage(crop, 0, top, crop.width, row.height, 0, 0, crop.width, row.height);

            rowTexts.push((await worker.recognize(row)).data.text.trim());

            row.width = 0;
            row.height = 0;
          }
        }

        for (const y of lines.rows) {
          for (let yy = Math.max(0, y - 1); yy <= Math.min(crop.height - 1, y + 1); yy++) {
            for (let x = 0; x < crop.width; x++) {
              const index = (yy * crop.width + x) * 4;
              pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = 255;
            }
          }
        }

        for (const x of lines.cols) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(crop.width - 1, x + 1); xx++) {
            for (let y = 0; y < crop.height; y++) {
              const index = (y * crop.width + xx) * 4;
              pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = 255;
            }
          }
        }

        context.putImageData(pixels, 0, 0);
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

        const clean = (await worker.recognize(crop)).data.text;

        parts[name + 'Original'] = first;
        parts[name + 'Clean'] = clean;
        parts[name + 'Rows'] = rowTexts.join('\n');
        parts[name] = reconcileReadings([first, clean, rowTexts.join('\n')]);
      } else {
        parts[name] = first;
      }

      crop.width = 0;
      crop.height = 0;
    }
  } finally {
    await worker.terminate();
    canvas.width = 0;
    canvas.height = 0;
  }

  return { parts, data: templates['fa-palekat-v1'].parse(parts) };
}

export async function documentCanvas(file: File) {
  const canvas = document.createElement('canvas');

  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;

    try {
      if (pdf.numPages !== 1) {
        throw Error(
          'Gunakan satu halaman resep per dokumen. Pisahkan PDF multi-halaman terlebih dahulu.',
        );
      }

      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 3 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvas,
        canvasContext: canvas.getContext('2d')!,
        viewport,
      }).promise;
    } finally {
      await pdf.destroy();
    }
  } else {
    const bitmap = await createImageBitmap(file);

    if (bitmap.width * bitmap.height > 30000000) {
      bitmap.close();
      throw Error('Gambar terlalu besar. Gunakan maksimal 30 megapiksel.');
    }

    const scale = Math.min(1, 3200 / bitmap.width);

    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
  }

  return canvas;
}
