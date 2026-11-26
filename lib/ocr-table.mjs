import { parseRows, total } from './template-fa.mjs';

// Select only values actually read by OCR; never calculate missing row amounts.
export function reconcileReadings(texts) {
  const parsed = texts.map((text) => parseRows(text, ''));

  const score = (result) =>
    result.rows.length * 10 +
    (result.printed !== null && Math.abs(total(result.rows) - result.printed) < 0.02
      ? 1000
      : 0);

  let best = parsed.reduce(
    (current, candidate) => (score(candidate) > score(current) ? candidate : current),
    parsed[0],
  );

  const groups = new Map();
  let safe = true;

  for (const result of parsed) {
    const seen = new Set();

    for (const row of result.rows) {
      const key = row.color.toLowerCase().replace(/[^a-z]/g, '');

      if (seen.has(key)) {
        safe = false;
        break;
      }

      seen.add(key);

      if (!groups.has(key)) groups.set(key, []);

      const group = groups.get(key);
      if (!group.some((entry) => entry.kg === row.kg)) group.push(row);
    }
  }

  const printed = [...new Set(parsed.map((result) => result.printed).filter((value) => value !== null))];

  // Only reconcile unique color rows and a single agreed printed total.
  if (
    safe &&
    printed.length === 1 &&
    groups.size <= 12 &&
    [...groups.values()].reduce((count, group) => count * group.length, 1) <= 4096
  ) {
    const combinations = [];

    function visit(index, rows) {
      const entries = [...groups.values()];

      if (index === entries.length) {
        if (Math.abs(total(rows) - printed[0]) < 0.02) combinations.push(rows);
        return;
      }

      for (const row of entries[index]) visit(index + 1, [...rows, row]);
    }

    visit(0, []);

    if (combinations.length === 1) {
      best = { rows: combinations[0], printed: printed[0] };
    }
  }

  if (best.printed === null && printed.length === 1) {
    best = { ...best, printed: printed[0] };
  }

  const reference = parsed
    .reduce(
      (current, candidate) => (candidate.rows.length > current.rows.length ? candidate : current),
      parsed[0],
    )
    .rows.map((row) => row.color.toLowerCase().replace(/[^a-z]/g, ''));

  best.rows.sort(
    (a, b) =>
      reference.indexOf(a.color.toLowerCase().replace(/[^a-z]/g, '')) -
      reference.indexOf(b.color.toLowerCase().replace(/[^a-z]/g, '')),
  );

  return best.rows
    .map((row) => `${Number(row.kg).toFixed(2)} ${row.color}`)
    .concat(best.printed === null ? [] : [`${best.printed.toFixed(2)} TOTAL`])
    .join('\n');
}

export function tableLines(data, width, height) {
  const dark = (x, y) => {
    const index = (y * width + x) * 4;
    return (data[index] + data[index + 1] + data[index + 2]) / 3 < 160;
  };

  const rows = [];
  const cols = [];

  for (let y = 0; y < height; y++) {
    let run = 0;
    let max = 0;

    for (let x = 0; x < width; x++) {
      run = dark(x, y) ? run + 1 : 0;
      max = Math.max(max, run);
    }

    if (max > width * 0.6) rows.push(y);
  }

  for (let x = 0; x < width; x++) {
    let run = 0;
    let max = 0;

    for (let y = 0; y < height; y++) {
      run = dark(x, y) ? run + 1 : 0;
      max = Math.max(max, run);
    }

    if (max > height * 0.8) cols.push(x);
  }

  const groups = [];

  for (const y of rows) {
    if (!groups.length || y > groups.at(-1).at(-1) + 1) groups.push([y]);
    else groups.at(-1).push(y);
  }

  const boundaries = [-1, ...groups.map((group) => group.at(-1)), height];

  return {
    rows,
    cols,
    bands: boundaries
      .slice(0, -1)
      .map((top, index) => [top + 3, boundaries[index + 1] - 4])
      .filter(([start, end]) => end - start > 10),
  };
}
