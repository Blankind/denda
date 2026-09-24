import { google } from 'googleapis';

let cachedSheets: ReturnType<typeof google.sheets> | null = null;

export function getSheets() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error(
      'Kredensial Google Sheets belum diset. Pastikan GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, dan SPREADSHEET_ID sudah ada di Environment Variables.'
    );
  }

  if (!cachedSheets) {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    cachedSheets = google.sheets({ version: 'v4', auth });
  }

  return { sheets: cachedSheets, spreadsheetId };
}
