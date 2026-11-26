import { fields, number, total } from './template-fa.mjs';

const spreadsheetType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function downloadRecipe(data: any) {
  const { Workbook } = await import('exceljs');
  const book = new Workbook();

  book.creator = 'Report System';

  const identity = book.addWorksheet('Identitas');
  identity.addRow(['Identitas resep', 'Nilai']);

  for (const [key, label] of Object.entries(fields)) {
    identity.addRow([label, String(data.identity[key] || '')]);
  }

  identity.addRow(['Catatan', String(data.notes || '')]);

  for (const side of ['lusi', 'pakan']) {
    const sheet = book.addWorksheet(side === 'lusi' ? 'Lusi' : 'Pakan');
    sheet.addRow(['Nomor benang', 'Warna', 'KG']);

    for (const row of data[side]) {
      sheet.addRow([
        String(row.yarn),
        String(row.color),
        Number.isFinite(number(row.kg)) ? number(row.kg) : String(row.kg),
      ]);
    }

    sheet.addRow(['', 'Total', total(data[side])]);
    sheet.addRow(['', 'Total tercetak', data.printed?.[side] ?? '']);
    sheet.getColumn(3).numFmt = '#,##0.00';
  }

  const summary = book.addWorksheet('Rekap');
  summary.addRows([
    ['Bagian', 'Total KG'],
    ['Lusi', total(data.lusi)],
    ['Pakan', total(data.pakan)],
    ['Total', total(data.lusi) + total(data.pakan)],
  ]);
  summary.getColumn(2).numFmt = '#,##0.00';

  book.eachSheet((sheet) => {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.columns.forEach((column) => (column.width = 30));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF163B65' },
    };
  });

  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: spreadsheetType }));
  const link = document.createElement('a');

  link.href = url;
  link.download = `Resep_${String(data.identity.resep || 'FA').replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  )}.xlsx`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadArchive(records: any[]) {
  const { Workbook } = await import('exceljs');
  const book = new Workbook();

  book.creator = 'Report System';

  const recap = book.addWorksheet('Semua Resep');
  const detail = book.addWorksheet('Rincian Benang');

  recap.addRow([
    'Nomor Resep',
    'Tanggal',
    'Kode Produksi',
    'Nomor Desain',
    'Konstruksi',
    'Corak',
    'Total Lusi KG',
    'Total Pakan KG',
    'Total KG',
    'Catatan',
  ]);

  detail.addRow([
    'Nomor Resep',
    'Tanggal',
    'Bagian',
    'Nomor Benang',
    'Warna',
    'KG',
  ]);

  for (const record of records) {
    const data = record.data;
    if (!data) continue;

    const date = new Date(record.created_at);

    recap.addRow([
      String(record.recipe_number),
      date,
      data.identity?.kode || '',
      data.identity?.desain || '',
      data.identity?.konstruksi || '',
      data.identity?.corak || '',
      total(data.lusi || []),
      total(data.pakan || []),
      total(data.lusi || []) + total(data.pakan || []),
      data.notes || '',
    ]);

    for (const side of ['lusi', 'pakan']) {
      for (const row of data[side] || []) {
        detail.addRow([
          String(record.recipe_number),
          date,
          side,
          String(row.yarn || ''),
          String(row.color || ''),
          Number.isFinite(number(row.kg)) ? number(row.kg) : String(row.kg || ''),
        ]);
      }
    }
  }

  for (const sheet of [recap, detail]) {
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF163B65' },
    };
    sheet.columns.forEach((column) => (column.width = 25));
    sheet.getColumn(2).numFmt = 'dd/mm/yyyy hh:mm';
  }

  for (const column of [7, 8, 9]) recap.getColumn(column).numFmt = '#,##0.00';
  detail.getColumn(6).numFmt = '#,##0.00';

  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer as BlobPart], { type: spreadsheetType }));
  const link = document.createElement('a');

  link.href = url;
  link.download = 'Arsip_Resep_FA.xlsx';
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
