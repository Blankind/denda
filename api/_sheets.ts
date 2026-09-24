import { google } from 'googleapis';

// Env dipakai dulu. Kalau kosong, pakai fallback di bawah.
const FALLBACK = {
  spreadsheetId: '1AhNvCcrdX5bXXwqjDiAwKgGBujQUxsN5QsYQw3C9tn0',
  clientEmail: 'robot-denda@gps-dhk.iam.gserviceaccount.com',
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC5MHD/z98rdRfA\ni5+LIPLBdd3nD8GlnpPQKniaZUq12VpSRME6c+LGay+pKhoKhFN+OVGoeLGO1o1p\nLlf4lU5KEVY3xI1sAoiMX9oqG7rJ6ZfC3GYqZ9pYStdbGgug9dSE76GIiWylnlYg\nTykvKUfFKlf/P/M34hHVe3y062PGSZpk6s+QvgR5FtG9NXgMB8feD/Gc96y+ROpL\nz6PO3FDzdQ4cOvJnnG6oo2Ltj82/XxwPVV4nB238HXULaIkHfF2QQprnXyqOlkbO\ntV6HpODz0wDofnJdtEQ3qfAm1l2/Es/OmZC50z5Mx1poLZ7YImJt/6fPBQg8CwFC\n0GakKWPXAgMBAAECggEABNw4mv4hpUpVbUA817HtrRYi1MWdF3Op/XSf5a1y4ILr\n0+zqBVa1RO/bOF1agZwndNCcTAee4VjQLUqCFIwWmesKkDwgWg1W+Bgr6Z8Ar/vp\nd7vBEqvXFyofrMxqMbdB9Js1ahfxOgeFyyNIuWwj7hDGbnSHNZhBT5EGHNlwrOuG\nJ5AeDWKkzWOrLMWDLZjRyW8dQMuofE86JF5nz5pH92xy3b0wPjAfyCkg9mHVfUuI\n77LDNUSOeINJfi9cuuWYR7yUrX3Vjsq/N0+JepXj2KLxU4seujoZd2HSucQg25cd\nVxsL4N5Iq9sjNPTt1J8vPf8bmYYLFU4jMkVdaRh/AQKBgQDmD9b5QCe3Y8EBHGPH\nGNs1UViWPcv4i08rqA7s49oxJCEcJlsbWEyPQj3StA6kUbdEYjfrHbDvwKzBTttJ\nCVp8Sf4g2urZ1GsnnpoiemVRiZO/YNj+UhMfoDi6TFkQnmK/9RPNWkI66thnt9M6\n3UgGj3pI4HRHO/Hqh12jfSlHMQKBgQDOEXcFH6o3pVbr8t/8sRc7Sxf/s5Mampfo\n+DX4s+zBfbQNBVhmobaTJyd63WeUuIRigbMLcPauS9kvWZi5G43CtqkHbuiMw6YP\nZxBmmdgz81uKY0N6ZM8Hy1fkWhCOqG5vXtK24jisJKQS0tzz0tBCF+uIgyh6QDbI\nFduXU14phwKBgDAFvmno6mFtgSwqMOmuVpOal1NFMv5+ldgXDIaGSVVYpVCq8PmU\nRObifOUukJ/cLtUna2S4neZt4aG4RC3KtgibqWBSUhOGM5fhk2r/AYczoJOiM6li\nmHtRhoXcyfqeFR7cmXWUEZ8axnFf/cebyR0VdgEgWSVFbgn2l6U4yxUBAoGAUowi\nfnXxzPq5uCkB2wrhwInTYkYAPp8BDX0ouajxxYzibHjgsbREG+yKXyiEDspflcpY\n+9NTrfyKUvJ0QGquPfrH+UdPdtwFEJR7uG4WcrEg0W30IPpzCK9HVR1TFqKYIpr8\nk/BJPYQsCbJYen/PlzpXysanl1lT2JEQ9yyZQs8CgYBDrM+qsezAfyN/0vRE0AjD\no2AvRRt7RhjRQTawrTiybAEUX+nuGHxv/HoI73DNvWF91DE+Ytx1bKAPDKou0rNN\nXWGPOZABqz05/VxnZ4Dywrd8r8wjXp3kq+inLnubr730qiL/P1Z47djO53gz2qTc\n4YTxDerAy0+KiuRPWA4oCQ==\n-----END PRIVATE KEY-----\n
`,
};

let cachedSheets: ReturnType<typeof google.sheets> | null = null;

export function getSheets() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || FALLBACK.clientEmail;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || FALLBACK.privateKey).replace(/\\n/g, '\n');
  const spreadsheetId = process.env.SPREADSHEET_ID || FALLBACK.spreadsheetId;

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
