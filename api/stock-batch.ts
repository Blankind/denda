import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';
import { ensureStockSheets } from './_stock-sheets.js';

// Kolom sama dengan api/stock.ts: id | createdAt | period | itemName | branch | name |
// qtySelisih | systemValue | claimValue | installmentsJson | isPaidOff | description | isNotRecognized | historyRaw | itemGroup
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
  let sheets: ReturnType<typeof getSheets>['sheets'];
  let spreadsheetId: string;
  try {
    ({ sheets, spreadsheetId } = getSheets());
    await ensureStockSheets(sheets, spreadsheetId);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }

  // POST - simpan banyak record selisih stock sekaligus (hasil import excel)
  if (req.method === 'POST') {
    try {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const rows = records.map(toRow);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'StockOpname!A:O',
        valueInputOption: 'RAW',
        requestBody: { values: rows },
      });

      return res.json({ success: true, count: rows.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
