import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRows, total, number, parseFA } from '../lib/template-fa.mjs';

test('decimal comma and dot', () => {
  assert.equal(number('12.50'), 12.5);
  assert.equal(number('1.234,50'), 1234.5);
  assert.ok(Number.isNaN(number('abc')));
});

test('separate rows from printed total', () => {
  const x = parseRows(
    '1.900 61,28 → Olive Hijau Tua\n1.328 42,83 → Hitam\n960 30,96 → Krem Tua\n892 28,77 → Merah Rose\n5.080 163,83',
    '30s TR',
  );

  assert.equal(x.rows.length, 4);
  assert.equal(total(x.rows), 163.84);
  assert.equal(x.printed, 163.83);
});

test('ignore helai and spring, preserve color', () => {
  const x = parseRows(
    '1.680 80,64 100 Olive Hijau Tua\n764 36,67 46 Hitam\n736 35,33 44 Krem Tua\n700 33,60 42 Merah Rose\n3.880 186,24 232',
    '30s TR',
  );

  assert.equal(x.rows[0].color, 'Olive Hijau Tua');
  assert.equal(total(x.rows), 186.24);
  assert.equal(x.printed, 186.24);
});

test('split merged header columns without leaking labels into values', () => {
  const d = parseFA({
    header:
      'Kode Produksi : P.46 Konstruksi : 30s TR x 30s TR\nNomor Desain : BB-460745ELKL\nNomor Resep : 46BB--0745E(DB) Corak : Bintingan Besar\nIsi Beam : 1000 Ptg x 2 Beam\nNo.Beam : ....\nMesin : Rappier Double Beam\nNo. Mesin :',
    lusi: '1680 80,64 Hitam',
    pakan: '',
  });

  assert.equal(d.identity.kode, 'P.46');
  assert.equal(d.identity.konstruksi, '30s TR x 30s TR');
  assert.equal(d.identity.corak, 'Bintingan Besar');
  assert.equal(d.identity.noBeam, '');
  assert.equal(d.lusi[0].yarn, '30s TR');
});
