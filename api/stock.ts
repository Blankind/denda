import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';

// Kolom: id | createdAt | itemName | branch | name | qtySelisih | systemValue | claimValue | installmentsJson | isPaidOff | description
const RANGE = 'StockOpname!A:K';

function parseRow(row: any[]) {
  return {
    id: row[0] || '',
    createdAt: row[1] || '',
    itemName: row[2] || '',
    branch: row[3] || '',
    name: row[4] || '',
    qtySelisih: row[5] !== undefined && row[5] !== '' ? Number(row[5]) : undefined,
    systemValue: Number(row[6] || 0),
    claimValue: row[7] !== undefined && row[7] !== '' ? Number(row[7]) : undefined,
    installments: (() => {
      try { return JSON.parse(row[8] || '[]'); } catch { return []; }
    })(),
    isPaidOff: row[9] === 'TRUE' || row[9] === true,
    description: row[10] || '',
  };
}

function toRow(r: any) {
  return [
    r.id,
    r.createdAt,
    r.itemName,
    r.branch,
    r.name,
    r.qtySelisih ?? '',
    r.systemValue ?? 0,
    r.claimValue ?? '',
    JSON.stringify(r.installments || []),
    r.isPaidOff ? 'TRUE' : 'FALSE',
    r.description || '',
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let sheets: ReturnType<typeof getSheets>['sheets'];
  let spreadsheetId: string;
  try {
    ({ sheets, spreadsheetId } = getSheets());
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
