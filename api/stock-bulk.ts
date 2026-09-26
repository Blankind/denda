import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';
import { ensureStockSheets } from './_stock-sheets.js';

// Update banyak record sekaligus (mis. tandai tidak diakui massal, pelunasan massal)
// dalam 1x values.get + 1x values.batchUpdate, bukan N request PUT paralel yang gampang
// kena rate-limit Google Sheets API kalau item yang dipilih banyak.

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
    r.historyRaw || '',
    r.itemGroup || '',
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  let sheets: ReturnType<typeof getSheets>['sheets'];
  let spreadsheetId: string;
  try {
    ({ sheets, spreadsheetId } = getSheets());
    await ensureStockSheets(sheets, spreadsheetId);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }

  const records: any[] = Array.isArray(req.body) ? req.body : [];
  if (!records.length) return res.json({ success: true, updated: 0, missing: [] });

  try {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'StockOpname!A:A' });
    const rows = response.data.values || [];
    const rowIndexById = new Map<string, number>();
    rows.forEach((row: any, idx: number) => {
      if (row[0]) rowIndexById.set(row[0], idx);
    });

    const missing: string[] = [];
    const data = records
      .map(r => {
        const rowIndex = rowIndexById.get(r.id);
        if (rowIndex === undefined) {
          missing.push(r.id);
          return null;
        }
        return {
          range: `StockOpname!A${rowIndex + 1}:O${rowIndex + 1}`,
          values: [toRow(r)],
        };
      })
      .filter((d): d is { range: string; values: any[][] } => d !== null);

    if (data.length) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: { valueInputOption: 'RAW', data },
      });
    }

    return res.json({ success: true, updated: data.length, missing });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
