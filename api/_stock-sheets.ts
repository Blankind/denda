import { google } from 'googleapis';

let ensured = false;

// Buat tab StockOpname & StockLogs + header kalau belum ada di spreadsheet.
export async function ensureStockSheets(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
) {
  if (ensured) return;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = (meta.data.sheets || []).map((s) => s.properties?.title);

  const requests: any[] = [];
  if (!existing.includes('StockOpname')) requests.push({ addSheet: { properties: { title: 'StockOpname' } } });
  if (!existing.includes('StockLogs')) requests.push({ addSheet: { properties: { title: 'StockLogs' } } });
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  const headers: Record<string, string[]> = {
    'StockOpname!A1:O1': [
      'id', 'createdAt', 'period', 'itemName', 'branch', 'name',
      'qtySelisih', 'systemValue', 'claimValue', 'installmentsJson', 'isPaidOff', 'description', 'isNotRecognized',
      'historyRaw', 'itemGroup',
    ],
    'StockLogs!A1:D1': ['id', 'timestamp', 'action', 'details'],
  };
  for (const [range, values] of Object.entries(headers)) {
    const cur = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const existing = cur.data.values?.[0] || [];
    // Kosong -> tulis header baru. Sudah ada tapi kolom kurang (mis. sheet lama tanpa isNotRecognized) -> lengkapi.
    if (!existing.length || existing.length < values.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values: [values] },
      });
    }
  }

  ensured = true;
}
