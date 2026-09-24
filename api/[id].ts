import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheets } from '../_sheets';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { sheets, spreadsheetId } = getSheets();
  const targetId = req.query.id as string;

  // PUT - update record
  if (req.method === 'PUT') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:A',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Data tidak ditemukan' });

      const updatedRecord = req.body;
      const rowData = [
        updatedRecord.id,
        updatedRecord.createdAt,
        updatedRecord.name,
        updatedRecord.branch,
        updatedRecord.amount,
        updatedRecord.description,
        updatedRecord.documentDetail,
        updatedRecord.status || 'UNPAID',
        updatedRecord.paidAt || '',
        updatedRecord.destinationAccount || '',
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Records!A${rowIndex + 1}:J${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // DELETE - hapus record
  if (req.method === 'DELETE') {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:A',
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      if (rowIndex === -1) return res.status(404).json({ error: 'Data tidak ditemukan' });

      const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadSheet.data.sheets?.find((s: any) => s.properties.title === 'Records');
      if (!sheet) throw new Error("Sheet 'Records' tidak ditemukan");

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
