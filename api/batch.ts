import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { sheets, spreadsheetId } = getSheets();

  // POST - simpan banyak records sekaligus
  if (req.method === 'POST') {
    try {
      const records = req.body;
      if (!Array.isArray(records) || records.length === 0) {
        return res.json({ success: true, count: 0 });
      }

      const rows = records.map((r: any) => [
        r.id,
        r.createdAt,
        r.name,
        r.branch,
        r.amount,
        r.description,
        r.documentDetail || '',
        r.status || 'UNPAID',
        r.paidAt || '',
        r.destinationAccount || '',
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Records!A:J',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });

      return res.json({ success: true, count: rows.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
