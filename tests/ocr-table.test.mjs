import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reconcileReadings } from '../lib/ocr-table.mjs';
import { parseRows, total } from '../lib/template-fa.mjs';

test('real CamScanner readings recover four rows and preserve printed totals', () => {
  const { parts } = JSON.parse(
    fs.readFileSync(new URL('./fixtures/camscanner-ocr.json', import.meta.url)),
  );

  const cases = [
    ['lusi', [80.64, 36.67, 35.33, 33.6], 186.24],
    ['pakan', [61.28, 42.83, 30.96, 28.77], 163.83],
  ];

  for (const [side, expected, printed] of cases) {
    const r = parseRows(
      reconcileReadings([
        parts[side + 'Original'],
        parts[side + 'Clean'],
        parts[side + 'Rows'],
      ]),
      '30s TR',
    );

    assert.deepEqual(r.rows.map((x) => Number(x.kg)), expected);
    assert.equal(r.printed, printed);
    assert.deepEqual(r.rows.map((x) => x.color), [
      'Olive Hijau Tua',
      'Hitam',
      'Krem Tua',
      'Merah Rose',
    ]);
  }
});

test('never manufactures an amount from the missing total', () => {
  const r = parseRows(reconcileReadings(['10.00 Hitam\n30.00 TOTAL']), '');

  assert.equal(r.rows.length, 1);
  assert.equal(total(r.rows), 10);
  assert.equal(r.printed, 30);
});
