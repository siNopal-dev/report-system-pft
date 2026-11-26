import type { Point } from './perspective';

// Segment a light sheet from the surrounding desk, then infer its four edges.
export function detectPaper(canvas: HTMLCanvasElement): Point[] | null {
  const sample = document.createElement('canvas');
  const scale = Math.min(1, 700 / Math.max(canvas.width, canvas.height));

  sample.width = Math.max(2, Math.round(canvas.width * scale));
  sample.height = Math.max(2, Math.round(canvas.height * scale));

  const context = sample.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(canvas, 0, 0, sample.width, sample.height);

  const { data } = context.getImageData(0, 0, sample.width, sample.height);
  const width = sample.width;
  const height = sample.height;

  const color = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return [data[index], data[index + 1], data[index + 2]];
  };

  const seeds = [
    [0.5, 0.5],
    [0.35, 0.5],
    [0.65, 0.5],
    [0.5, 0.35],
    [0.5, 0.65],
  ].map(([x, y]) => color(Math.floor(x * (width - 1)), Math.floor(y * (height - 1))));

  const median = (channel: number) =>
    seeds.map((sample) => sample[channel]).sort((a, b) => a - b)[2];

  const paper = [median(0), median(1), median(2)];

  const distance = (a: number[], b: number[]) =>
    Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));

  const cornerSamples = [
    color(2, 2),
    color(width - 3, 2),
    color(width - 3, height - 3),
    color(2, height - 3),
  ];

  // Scan fills the whole image.
  if (cornerSamples.every((sample) => distance(sample, paper) < 36)) return null;

  const mask = new Uint8Array(width * height);
  const step = 2;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const sample = color(x, y);
      if (
        distance(sample, paper) < 65 &&
        sample[0] + sample[1] + sample[2] > 250
      ) {
        mask[y * width + x] = 1;
      }
    }
  }

  // Collect the largest contiguous area so other light objects do not become corners.
  const seen = new Uint8Array(width * height);
  let largest: number[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const start = y * width + x;
      if (!mask[start] || seen[start]) continue;

      const group: number[] = [];
      const queue = [start];
      seen[start] = 1;

      for (let head = 0; head < queue.length; head++) {
        const index = queue[head];
        const px = index % width;
        const py = Math.floor(index / width);
        group.push(index);

        for (const [xx, yy] of [
          [px - step, py],
          [px + step, py],
          [px, py - step],
          [px, py + step],
        ]) {
          const next = yy * width + xx;
          if (
            xx >= 0 &&
            xx < width &&
            yy >= 0 &&
            yy < height &&
            mask[next] &&
            !seen[next]
          ) {
            seen[next] = 1;
            queue.push(next);
          }
        }
      }

      if (group.length > largest.length) largest = group;
    }
  }

  if (largest.length < (0.13 * width * height) / (step * step)) return null;

  const points = largest.map((index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }));

  const xs = points.map((point) => point.x).sort((a, b) => a - b);
  const ys = points.map((point) => point.y).sort((a, b) => a - b);

  const low = (values: number[]) => values[Math.floor(values.length * 0.015)];
  const high = (values: number[]) => values[Math.floor(values.length * 0.985)];

  const minX = low(xs);
  const maxX = high(xs);
  const minY = low(ys);
  const maxY = high(ys);

  if ((maxX - minX) * (maxY - minY) < width * height * 0.25) return null;

  const closest = (x: number, y: number) => {
    let best = points[0];
    let score = Infinity;

    for (const point of points) {
      const delta = (point.x - x) ** 2 + (point.y - y) ** 2;
      if (delta < score) {
        best = point;
        score = delta;
      }
    }

    return {
      x: Math.max(0, Math.min(1, best.x / (width - 1))),
      y: Math.max(0, Math.min(1, best.y / (height - 1))),
    };
  };

  const quad = [
    closest(minX, minY),
    closest(maxX, minY),
    closest(maxX, maxY),
    closest(minX, maxY),
  ];

  const area =
    Math.abs(
      quad.reduce(
        (sum, point, index) =>
          sum + point.x * quad[(index + 1) % 4].y - point.y * quad[(index + 1) % 4].x,
        0,
      ),
    ) / 2;

  return area > 0.2 ? quad : null;
}
