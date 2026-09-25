import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from './_sheets.js';
import { ensureStockSheets } from './_stock-sheets.js';

// Log aktivitas khusus modul Selisih Stock, terpisah dari Logs milik Denda Operasional.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  let sheets: ReturnType<typeof getSheets>['sheets'];
  let spreadsheetId: string;
  try {
    ({ sheets, spreadsheetId } = getSheets());
    await ensureStockSheets(sheets, spreadsheetId);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }

  if (req.method === 'GET') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'StockLogs!A:D',
      }).catch(() => ({ data: { values: [] } }));

      const rows = (response as any).data.values || [];
      const logs = rows.slice(1).map((row: any) => ({
        id: row[0] || '',
        timestamp: row[1] || '',
        action: row[2] || '',
        details: row[3] || '',
      })).filter((l: any) => l.id).reverse();

      return res.json(logs);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const newLog = req.body;
      const row = [newLog.id, newLog.timestamp, newLog.action, newLog.details];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'StockLogs!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      }).catch(() => null);

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
