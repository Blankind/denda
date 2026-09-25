import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';
import { ensureStockSheets } from './_stock-sheets.js';

const SHEET_NAME = 'StockOpname';

function toRow(r: any) {
  return [
    r.id,
    r.createdAt,
    r.period || '',
    r.itemName,
    r.branch,
    r.name,
    r.qtySelisih ?? '',
    r.systemValue ?? 0,
    r.claimValue ?? '',
    JSON.stringify(r.installments || []),
    r.isPaidOff ? 'TRUE' : 'FALSE',
    r.description || '',
    r.isNotRecognized ? 'TRUE' : 'FALSE',
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let sheets: ReturnType<typeof getSheets>['sheets'];
  let spreadsheetId: string;
  try {
    ({ sheets, spreadsheetId } = getSheets());
    await ensureStockSheets(sheets, spreadsheetId);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
  const targetId = req.query.id as string;

  // PUT - update data (edit field, tambah angsuran, atau centang lunas/cukup)
  if (req.method === 'PUT') {
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'StockOpname!A:A' });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Data tidak ditemukan' });

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `StockOpname!A${rowIndex + 1}:M${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [toRow(req.body)] },
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE - hapus data
  if (req.method === 'DELETE') {
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'StockOpname!A:A' });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Data tidak ditemukan' });

      const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadSheet.data.sheets?.find((s: any) => s.properties.title === SHEET_NAME);
      if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' tidak ditemukan`);

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheet.properties!.sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          }],
        },
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
