export type Point = { x: number; y: number };

// Inverse projective mapping from unit rectangle to the selected paper corners.
export function coefficients(points: Point[]) {
  if (points.length !== 4) throw Error('Pilih empat sudut kertas.');

  const cross = points.map((a, index) => {
    const b = points[(index + 1) % 4];
    const c = points[(index + 2) % 4];
    return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
  });

  if (cross.some((value) => value <= 0.001)) {
    throw Error(
      'Sudut harus berurutan: kiri atas, kanan atas, kanan bawah, kiri bawah; jangan saling bersilang.',
    );
  }

  const [a, b, c, d] = points;
  const dx = b.x - c.x;
  const ex = d.x - c.x;
  const fx = a.x - b.x + c.x - d.x;
  const dy = b.y - c.y;
  const ey = d.y - c.y;
  const fy = a.y - b.y + c.y - d.y;

  const det = dx * ey - ex * dy;
  if (Math.abs(det) < 1e-8) throw Error('Area dokumen terlalu kecil.');

  const g = (fx * ey - ex * fy) / det;
  const h = (dx * fy - fx * dy) / det;

  return [
    b.x - a.x + g * b.x,
    d.x - a.x + h * d.x,
    a.x,
    b.y - a.y + g * b.y,
    d.y - a.y + h * d.y,
    a.y,
    g,
    h,
  ];
}

export async function rectify(source: HTMLCanvasElement, points: Point[]) {
  const [a, b, c, d, e, f, g, h] = coefficients(points);
  const output = document.createElement('canvas');

  output.width = 1800;
  output.height = 2546;

  const input = source.getContext('2d')!.getImageData(0, 0, source.width, source.height);
  const context = output.getContext('2d')!;
  const destination = context.createImageData(output.width, output.height);

  for (let y = 0; y < output.height; y++) {
    const v = y / (output.height - 1);

    for (let x = 0; x < output.width; x++) {
      const u = x / (output.width - 1);
      const z = g * u + h * v + 1;

      const sx = Math.max(
        0,
        Math.min(source.width - 1, ((a * u + b * v + c) / z) * (source.width - 1)),
      );
      const sy = Math.max(
        0,
        Math.min(source.height - 1, ((d * u + e * v + f) / z) * (source.height - 1)),
      );

      const ix = Math.floor(sx);
      const iy = Math.floor(sy);
      const tx = sx - ix;
      const ty = sy - iy;
      const target = (y * output.width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const at = (xx: number, yy: number) =>
          input.data[
            (Math.min(source.height - 1, yy) * source.width +
              Math.min(source.width - 1, xx)) *
              4 +
              channel
          ];

        destination.data[target + channel] =
          (1 - ty) * ((1 - tx) * at(ix, iy) + tx * at(ix + 1, iy)) +
          ty * ((1 - tx) * at(ix, iy + 1) + tx * at(ix + 1, iy + 1));
      }

      destination.data[target + 3] = 255;
    }

    if (y % 96 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }

  context.putImageData(destination, 0, 0);
  return output;
}
