export const fields = {
  kode: 'Kode Produksi',
  desain: 'Nomor Desain',
  resep: 'Nomor Resep',
  konstruksi: 'Konstruksi',
  corak: 'Corak',
  beam: 'Isi Beam',
  noBeam: 'Nomor Beam',
  mesin: 'Mesin',
  noMesin: 'Nomor Mesin',
};

export const blank = () => ({
  identity: Object.fromEntries(Object.keys(fields).map((key) => [key, ''])),
  lusi: [],
  pakan: [],
  printed: { lusi: null, pakan: null },
  notes: '',
});

export function number(value) {
  const text = String(value).trim();
  if (!text) return NaN;
  if (!/^-?\d+(?:[.,]\d+)*$/.test(text)) return NaN;

  return Number(
    text.includes(',')
      ? text.replace(/\./g, '').replace(',', '.')
      : text,
  );
}

export const total = (rows) =>
  Math.round(
    rows.reduce(
      (sum, row) => sum + (Number.isFinite(number(row.kg)) ? number(row.kg) : 0),
      0,
    ) * 100,
  ) / 100;

// OCR runs on separate spatial regions: left motif never participates in yarn parsing.
export function parseRows(text, yarn) {
  const rows = [];
  let printed = null;

  for (const line of text.split('\n')) {
    const match = line.match(
      /(?:^|\s)(\d+(?:\.\d{3})*,\d{1,3}|\d+\.\d{1,2})(?=\s|$)/,
    );
    if (!match) continue;

    const kg = number(match[1]);
    const color = line
      .slice(match.index + match[0].length)
      .replace(/^\s*[\d.,]+\s*/, '')
      .replace(/^[\s→=>|:–—»<>-]+/, '')
      .replace(/[\s|—–.-]+$/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim()
      .split(/\s{4,}/)[0];

    if (!color || /^(total|jumlah)/i.test(color)) {
      printed = kg;
      continue;
    }

    if ((color.match(/[a-z]/gi) || []).length < 2) continue;

    rows.push({ yarn, color, kg: String(kg) });
  }

  return { rows, printed };
}

export function parseFA(parts) {
  const data = blank();

  // Match every label, including labels joined onto the same OCR line.
  const labels = {
    kode: 'Kode\\s*Produksi',
    desain: '(?:Nomor|No\\.?)\\s*Desain',
    resep: '(?:Nomor|No\\.?)\\s*Resep',
    konstruksi: 'Konstruksi',
    corak: 'Corak',
    beam: 'Isi\\s*Beam',
    noBeam: '(?:No\\.?|Nomor)\\s*Beam',
    noMesin: '(?:No\\.?|Nomor)\\s*Mesin',
    mesin: 'Mesin',
    ignore: '(?:Nomor\\s*Pesanan|PESANAN|No\\.?\\s*Reg|Note|Teni)',
  };

  const pattern = new RegExp(
    '(' + Object.values(labels).join('|') + ')[ \\t]*[:：][ \\t]*',
    'gi',
  );

  const text = [parts.header || '', parts.headerLeft || '', parts.headerRight || ''].join(
    '\n',
  );

  const matches = [...text.matchAll(pattern)];

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const key = Object.keys(labels).find((name) =>
      new RegExp('^(?:' + labels[name] + ')$', 'i').test(match[1]),
    );

    if (!key || key === 'ignore') continue;

    const chunk = text.slice(
      match.index + match[0].length,
      matches[index + 1]?.index ?? text.length,
    );

    let value =
      chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)[0] || '';

    value = value.replace(/^[\s.|:]+|[\s|]+$/g, '');
    if (/^[.\s…_-]*$/.test(value)) value = '';

    data.identity[key] = value;
  }

  const yarns = data.identity.konstruksi.split(/\s*[x×]\s*/i);

  for (const [index, side] of ['lusi', 'pakan'].entries()) {
    const parsed = parseRows(parts[side] || '', yarns[index]?.trim() || '');
    data[side] = parsed.rows;
    data.printed[side] = parsed.printed;
  }

  return data;
}

export const templates = {
  'fa-palekat-v1': {
    name: 'Resep FA • Perencanaan Palekat',
    parse: parseFA,
    regions: {
      headerLeft: [0.07, 0.045, 0.44, 0.16],
      headerRight: [0.51, 0.045, 0.41, 0.19],
      lusi: [0.47, 0.32, 0.43, 0.185],
      pakan: [0.47, 0.728, 0.43, 0.107],
    },
  },
};
