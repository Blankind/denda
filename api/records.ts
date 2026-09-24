import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { sheets, spreadsheetId } = getSheets();

  // GET - ambil semua records
  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:J',
      });

      const rows = response.data.values || [];
      const records = rows.slice(1).map((row: any) => ({
        id: row[0] || '',
        createdAt: row[1] || '',
        name: row[2] || '',
        branch: row[3] || '',
        amount: Number(row[4] || 0),
        description: row[5] || '',
        documentDetail: row[6] || '',
        status: row[7] || 'UNPAID',
        paidAt: row[8] || '',
        destinationAccount: row[9] || '',
      })).filter((r: any) => r.id);

      return res.json(records);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST - tambah satu record
  if (req.method === 'POST') {
    try {
      const newRecord = req.body;
      const row = [
        newRecord.id,
        newRecord.createdAt,
        newRecord.name,
        newRecord.branch,
        newRecord.amount,
        newRecord.description,
        newRecord.documentDetail,
        newRecord.status || 'UNPAID',
        newRecord.paidAt || '',
        newRecord.destinationAccount || '',
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Records!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
