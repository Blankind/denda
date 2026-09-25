import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';
import { ensureStockSheets } from './_stock-sheets.js';

// Kolom: id | createdAt | period | itemName | branch | name | qtySelisih | systemValue | claimValue | installmentsJson | isPaidOff | description | isNotRecognized
const RANGE = 'StockOpname!A:M';

function parseRow(row: any[]) {
  return {
    id: row[0] || '',
    createdAt: row[1] || '',
    period: row[2] || '',
    itemName: row[3] || '',
    branch: row[4] || '',
    name: row[5] || '',
    qtySelisih: row[6] !== undefined && row[6] !== '' ? Number(row[6]) : undefined,
    systemValue: Number(row[7] || 0),
    claimValue: row[8] !== undefined && row[8] !== '' ? Number(row[8]) : undefined,
    installments: (() => {
      try { return JSON.parse(row[9] || '[]'); } catch { return []; }
    })(),
    isPaidOff: row[10] === 'TRUE' || row[10] === true,
    description: row[11] || '',
    isNotRecognized: row[12] === 'TRUE' || row[12] === true,
  };
}

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

  // GET - ambil semua data selisih stock
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({ spreadsheetId, range: RANGE });
      const rows = response.data.values || [];
      const records = rows.slice(1).map(parseRow).filter((r: any) => r.id);
      return res.json(records);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - tambah data baru
  if (req.method === 'POST') {
    try {
      const newRecord = req.body;
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [toRow(newRecord)] },
      });
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
