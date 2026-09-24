import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from '../_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sheets, spreadsheetId } = getSheets();

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) {
      return res.json({ success: true, count: 0 });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Records!A:A',
    });

    const rows = response.data.values || [];
    const indicesToDelete: number[] = [];
    rows.forEach((r: any, idx: number) => {
      if (idx > 0 && ids.includes(r[0])) indicesToDelete.push(idx);
    });

    indicesToDelete.sort((a, b) => b - a);

    const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadSheet.data.sheets?.find((s: any) => s.properties.title === 'Records');
    if (!sheet) throw new Error("Sheet 'Records' tidak ditemukan");

    if (indicesToDelete.length > 0) {
      const requests = indicesToDelete.map((rowIndex) => ({
        deleteDimension: {
          range: {
            sheetId: sheet.properties!.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }));

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    return res.json({ success: true, count: indicesToDelete.length });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
