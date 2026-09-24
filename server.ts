import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

let sheetsClient: any = null;

function getSheets() {
  const clientEmail = "reject@smooth-aura-465504-i3.iam.gserviceaccount.com";
  let privateKey = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC/5nYQpq0ids6d
G20jl86GzVMVWKT1Y+zeZY85upeOotBY/vEdpGyQ/31aZGkdbPbcnOiC2pQAdoc2
uvHx+T+zQwtkgZwOiIh7enmIhN0FNQfqdA35v1i/WPePbMvIyY6xw/uyu/mdG6gN
oL2u60Zt7qIlSCzsn67ifc7wfGZf3QqtAt0JFWjYMCxkiTqrU32DJ5DxiLq6aMj4
bPefLg5qT55pToy/nkAtnjf8ZxAAkNE6tnaWaZASRSyvzcQqxYamlD5wTL4vsGk3
AjsKXP1rOdLrz6dnaV+tul1+XIR3KTFowHwhgSMAFKDQ8VIlU7rBLFVDWMLeWNyj
V9Lm6QqZAgMBAAECggEADDjzW8556DWKpbK0VK2GanXpF6Ah6ufr6M2tfdRMHeTH
LLvu2Iql8uWgSCHCw4HdW/d5zwfOoGmW5XNVFf/gQPHWvRaM6Cy7C1Olf6lSuH0E
XY2kbDv155i/injipo3BPcJJUDzXwlwba+Qei2W8gnj4sTOJJPhrYk1NYRTTTRdX
VY3rsyEz/Fsjul5bJHALYzv3Iyd7KTHRi3LXo/c3wBEALqbczKnYrzitpNQZnFhy
Ba1n/9S0dr+2xR7rPDgVUgPPYVRRTBAXCM1ok1fgJwT99HdzUbp2JCcDwio8nSxj
IGFawfdqhTHg9awWjJClHMJ8CK/wYQSQeUA0uowb2QKBgQDeLHfJEFiKY+xrCGtB
LCl38j0a+WeuMgCqjJmewNVCVnbZ0NlTp7/22InjgGudtB5Ni1Pt8auIyCA9HsNm
UC11be/q3R1wsyrDOKL7M18Pmd40WDo7lztdE7FrzEl6iYQ+wVRBdVl/BeH+nXTU
6yPkumaUfam7InUkJa4QYpp97QKBgQDdHgriMHjOdCeezNNV9rmYR7KEAaNdgf/A
d+I+qXLUHV48kT0cAt07lINLM+JwHVKCKi5vA36GJxqcX3RC0ctLpvIG/HSD/s2k
tlqq2DN4URQCKwhgTY0HJ07v2D37qhmUETzqR8Sf7DsmINGXQzX6g2DJVmxZw9Mx
X2VrYfEJ3QKBgQDMaA0tJ6TObnCtaOmE5KSifnRJxPzm/4otX35W2QNcLUDb1ZKd
rNCow0DZ1uUsCvN2VKG7YYV4Kue+U/diwpGQYL1DUHwtnCnTwt/wTatAJ0iQ0DuD
Z/huAhhSHXndC3hoZGaoctcMTtVF9Ifw/QXhAr4uEA+A5Irx3tjuqkmJYQKBgQCs
kQS3cFLn9RjywzHwNgS0hsgYY9rmYE2EHUvR0ZbPWjgwlr0VflrAY/BvoYeILio1
ccwZUaXN9vi6r3hhqa+6VAkxUJdyaEp/0N1D1kWdEdHGu2TnG78DpTbi0mXVYfRi
bW2X/fjDQq8K27QXFBotb5j6qNsY106cirHxM1fVdQKBgQCxY2nQCivuEMQ6Tm9J
e/hGQGs0YsdsRI0UR4EbCuy3xXoSP18sCBkPcjoKpIOI4T1FL5+MIofq5FSSUrBo
Ne5oxKouYUXwTsoG3Neu7dnfcepDWPbA7byyThaCjhGp6ZDj8FZwE3En6R7SR2AT
e/uYnmC5362u94QbI6yDm39bJA==
-----END PRIVATE KEY-----
`;
  
  if (!sheetsClient) {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

// Initialize spreadsheet structure if missing
async function initializeSpreadsheet(sheets: any, spreadsheetId: string) {
  try {
    const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadSheet.data.sheets.map((s: any) => s.properties.title);

    const requests = [];

    // Create Records sheet if missing
    if (!existingSheets.includes('Records')) {
      requests.push({
        addSheet: { properties: { title: 'Records' } }
      });
    }

    // Create Logs sheet if missing
    if (!existingSheets.includes('Logs')) {
      requests.push({
        addSheet: { properties: { title: 'Logs' } }
      });
    }

    // If we need to create new sheets, do it now
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
    }

    // Ensure headers exist for Records
    const recordsHeader = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Records!A1:J1',
    }).catch(() => ({ data: { values: [] } }));
    
    if (!recordsHeader.data.values || recordsHeader.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Records!A1:J1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['ID', 'Tanggal Dibuat', 'Nama Lengkap', 'Cabang', 'Nominal (Rp)', 'Keterangan', 'Detail Dokumen', 'Status', 'Tanggal Lunas', 'Tujuan Uang (Akun)']]
        }
      });
    }

    // Ensure headers exist for Logs
    const logsHeader = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Logs!A1:D1',
    }).catch(() => ({ data: { values: [] } }));

    if (!logsHeader.data.values || logsHeader.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Logs!A1:D1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['ID Log', 'Waktu (Timestamp)', 'Aksi', 'Detail Aktivitas']]
        }
      });
    }
  } catch (error) {
    console.error("Gagal menginisialisasi spreadsheet:", error);
  }
}

// Deterministic parser for Excel TSV format (e.g. copied from Google Sheets / Excel)
function parseExcelTsv(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  const records: any[] = [];
  let currentBranch = 'KREMBUNG';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect branch section headers (e.g., "GUDANG 1", "GUDANG 2", "KREMBUNG", etc.)
    if (/^(GUDANG\s+\d+|KREMBUNG|GUDANG\s+[A-Za-z0-9_-]+)/i.test(trimmed) && !trimmed.includes('\t')) {
      currentBranch = trimmed.toUpperCase();
      continue;
    }
    const parts = line.split('\t');
    if (parts.length > 0 && /^(GUDANG\s+\d+|KREMBUNG)/i.test(parts[0].trim()) && parts.slice(1).every((p) => !p.trim())) {
      currentBranch = parts[0].trim().toUpperCase();
      continue;
    }

    // Skip recap/subtotal rows
    if (
      trimmed.toUpperCase().includes('TOTAL KLAIM') ||
      (parts[0].trim() === '' && parts.some((p) => p.toUpperCase().includes('KURANG MUAT') || p.toUpperCase().includes('SALAH MUAT')))
    ) {
      continue;
    }

    // Check if line starts with date like D/M/YYYY, DD/MM/YYYY, DD-MM-YYYY, or D-M-YYYY
    const dateMatch = parts[0].trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const isoDate = `${year}-${month}-${day}`;

      const itemDesc = (parts[1] || '').trim();
      const qty = (parts[2] || '').trim();
      const customer = (parts[3] || '').trim();
      const pic = (parts[4] || '').trim();
      const problem = (parts[5] || '').trim();
      const note = (parts[6] || '').trim();

      // Extract amount: find last numeric part, remove dots/commas
      let rawAmount = '';
      for (let i = parts.length - 1; i >= 1; i--) {
        const p = (parts[i] || '').trim();
        const digitsOnly = p.replace(/[^\d]/g, '');
        if (digitsOnly && digitsOnly.length >= 4) {
          rawAmount = digitsOnly;
          break;
        }
      }
      if (!rawAmount) {
        rawAmount = (parts[7] || parts[parts.length - 1] || '').replace(/[^\d]/g, '');
      }
      const amount = Number(rawAmount) || 50000;

      let name = pic || customer || 'Tanpa Nama';
      if (pic && customer && !pic.includes(customer)) {
        name = `${pic} (${customer})`;
      }

      let description = problem;
      if (note) {
        description = problem ? `${problem} - ${note}` : note;
      }

      let documentDetail = itemDesc;
      if (qty) {
        documentDetail = `${itemDesc} [Qty: ${qty}]`;
      }

      // Check if branch is specified in the text/customer/pic (e.g. "NOVA KREMBUNG" -> branch KREMBUNG)
      let rowBranch = currentBranch;
      if (/KREMBUNG/i.test(line)) {
        rowBranch = 'KREMBUNG';
      } else if (/GUDANG\s*2/i.test(line)) {
        rowBranch = 'GUDANG 2';
      } else if (/GUDANG\s*1/i.test(line)) {
        rowBranch = 'GUDANG 1';
      }

      records.push({
        date: isoDate,
        branch: rowBranch,
        name,
        amount,
        description: description || '-',
        documentDetail: documentDetail || '-',
      });
    }
  }

  return records;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // API Extract from Screenshot with Gemini + Automatic Retry & Fallback
  app.post('/api/extract-screenshot', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Gambar atau screenshot tidak ditemukan.' });
      }

      const prompt = `Anda adalah asisten OCR dan analisis data denda/klaim gudang dan operasional.
Analisis gambar atau screenshot bukti denda/klaim/tabel spreadsheet/chat berikut dengan teliti.

PANDUAN MEMBACA TABEL SPREADSHEET (Bahkan jika header kolom terpotong atau tidak ada):
1. Kolom Tanggal: Biasanya ada di kolom awal (misal 11/9/2026 atau 12/9/2026), konversi ke format YYYY-MM-DD (misal: "2026-09-11").
2. Kolom Barang / Spesifikasi / Item: (misal "Plat GalvaNIS KILAP 0.7x4x8", "Spindo 40x60x0.8 FULL Kng"), masukkan ke "documentDetail".
3. Kolom Nama / Toko / PIC / Pelanggar: (misal "ELFA", "KEN KREMBUNG", "Nana", "MULTI LOGAM", "NASIR", atau "KOOR: RIFA"), masukkan ke "name". Utamakan nama orang atau PIC penanggung jawab/toko.
4. Kolom Masalah / Alasan: (misal "TDK TERKIRIM - GD LUPA DIMUAT KOOR :RIFA", "SALAH MUAT", "KURANG MUAT 2 ITEM KOOR:TIN"), masukkan ke "description".
5. Kolom Nominal: Angka di kolom paling kanan (misal 50000 atau 50.000), masukkan ke "amount" berupa angka integer murni.
6. Judul Bagian / Gudang: Jika ada tulisan seperti "GUDANG 1", "GUDANG 2", atau nama cabang di atas tabel atau di dalam baris, jadikan itu "branch". Jika tidak ada, isi "GUDANG".
7. JANGAN masukkan baris rekapan atau total (seperti "TOTAL KLAIM GD 1", "KURANG MUAT 100000"). Hanya ambil baris transaksi individu!
8. Pastikan menghasilkan setiap baris transaksi yang tertera di dalam array "records".

Kembalikan JSON dengan format:
{
  "records": [
    {
      "name": "string",
      "branch": "string",
      "amount": 50000,
      "description": "string",
      "documentDetail": "string",
      "date": "YYYY-MM-DD"
    }
  ]
}`;

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const cleanMimeType = mimeType || 'image/png';

      // Models to try with fallback in case of 503 High Demand
      const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
      let lastError: any = null;
      let response: any = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMimeType,
                      data: cleanBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    records: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          branch: { type: Type.STRING },
                          amount: { type: Type.NUMBER },
                          description: { type: Type.STRING },
                          documentDetail: { type: Type.STRING },
                          date: { type: Type.STRING },
                        },
                      },
                    },
                  },
                  required: ['records'],
                },
              },
            });
            if (response && response.text) break;
          } catch (err: any) {
            lastError = err;
            const errMsg = err?.message || String(err);
            const isRetryable = errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('429');
            if (isRetryable && attempt === 0) {
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            break; // Try next model
          }
        }
        if (response && response.text) break;
      }

      if (!response || !response.text) {
        throw lastError || new Error('Model AI sedang sibuk sementara. Silakan coba lagi sebentar.');
      }

      const responseText = response.text || '{"records":[]}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = { records: [] };
      }

      const recordsList = Array.isArray(parsedData.records)
        ? parsedData.records
        : (parsedData.name ? [parsedData] : []);

      // Clean up records: ensure numeric amount and non-empty name
      const cleaned = recordsList
        .filter((r: any) => r && (r.name || r.description || r.amount))
        .map((r: any) => ({
          name: String(r.name || 'Tanpa Nama').trim(),
          branch: String(r.branch || 'GUDANG 1').trim(),
          amount: Number(r.amount) || 0,
          description: String(r.description || '-').trim(),
          documentDetail: String(r.documentDetail || '').trim(),
          date: r.date && !isNaN(new Date(r.date).getTime()) ? r.date : new Date().toISOString().split('T')[0],
        }));

      res.json({ success: true, records: cleaned });
    } catch (error: any) {
      console.error('Gemini extraction error:', error);
      const is503 = error?.message?.includes('503') || error?.message?.includes('high demand') || error?.message?.includes('UNAVAILABLE');
      const errorMsg = is503
        ? 'Server AI Gemini sedang mengalami lonjakan antrean sementara (503). Sistem telah mencoba kembali secara otomatis namun server masih padat. Silakan klik tombol "Coba Lagi".'
        : (error.message || 'Gagal mengekstrak data dari gambar.');
      res.status(500).json({ error: errorMsg });
    }
  });

  // API Extract from Plain Text / Excel Copy-Paste
  app.post('/api/extract-text', async (req, res) => {
    try {
      const { rawText } = req.body;
      if (!rawText || !rawText.trim()) {
        return res.status(400).json({ error: 'Teks kosong atau tidak ditemukan.' });
      }

      // 1. Try deterministic TSV parser first (Instant & 100% accurate for Excel copy-paste)
      const directRecords = parseExcelTsv(rawText);
      if (directRecords.length > 0) {
        return res.json({ success: true, records: directRecords });
      }

      // 2. If not standard TSV, fallback to Gemini AI
      const prompt = `Analisis teks tabel berikut yang disalin dari Microsoft Excel atau Google Sheets.
Ekstrak setiap baris denda/klaim menjadi list data terstruktur JSON.
Abaikan baris header dan baris total.

Teks:
"""
${rawText}
"""

Aturan field:
- "name": nama orang, PIC, toko, atau pelanggan
- "branch": nama gudang/cabang jika ada (contoh: "GUDANG 1")
- "amount": nominal angka
- "description": alasan denda atau jenis kesalahan (misal SALAH MUAT, TDK TERKIRIM)
- "documentDetail": barang atau no dokumen jika ada
- "date": format YYYY-MM-DD jika ada tanggal di baris tersebut.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              records: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    branch: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    documentDetail: { type: Type.STRING },
                    date: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['records'],
          },
        },
      });

      const responseText = response.text || '{"records":[]}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch {
        parsedData = { records: [] };
      }

      const recordsList = Array.isArray(parsedData.records) ? parsedData.records : [];
      const cleaned = recordsList
        .filter((r: any) => r && (r.name || r.description || r.amount))
        .map((r: any) => ({
          name: String(r.name || 'Tanpa Nama').trim(),
          branch: String(r.branch || 'GUDANG 1').trim(),
          amount: Number(r.amount) || 0,
          description: String(r.description || '-').trim(),
          documentDetail: String(r.documentDetail || '').trim(),
          date: r.date && !isNaN(new Date(r.date).getTime()) ? r.date : new Date().toISOString().split('T')[0],
        }));

      res.json({ success: true, records: cleaned });
    } catch (error: any) {
      console.error('Extract text error:', error);
      res.status(500).json({ error: error.message || 'Gagal memproses teks.' });
    }
  });

  // Background initialization attempt
  setTimeout(async () => {
    try {
      const hasCreds = true;
      if (hasCreds) {
        const sheets = getSheets();
        await initializeSpreadsheet(sheets, "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE");
      }
    } catch (e) {
      console.log('Init skipped:', e);
    }
  }, 1000);

  // API Check Status
  app.get('/api/status', (req, res) => {
    const hasCreds = true;
    res.json({ configured: hasCreds });
  });

  // GET Records
  app.get('/api/records', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      
      const sheets = getSheets();
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
      
      res.json(records);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST Record
  app.post('/api/records', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      
      const sheets = getSheets();
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
        requestBody: { values: [row] }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST Records Batch
  app.post('/api/records/batch', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      

      const sheets = getSheets();
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

      res.json({ success: true, count: rows.length });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT Record
  app.put('/api/records/:id', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      const targetId = req.params.id;
      const sheets = getSheets();
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:A',
      });
      
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Data tidak ditemukan di Spreadsheet' });
      }
      
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
        requestBody: { values: [rowData] }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE Record
  app.delete('/api/records/:id', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      const targetId = req.params.id;
      const sheets = getSheets();
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:A',
      });
      
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((r: any) => r[0] === targetId);
      
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Data tidak ditemukan' });
      }
      
      const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadSheet.data.sheets.find((s: any) => s.properties.title === 'Records');
      if (!sheet) throw new Error("Sheet 'Records' tidak ditemukan");
      
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1
                }
              }
            }
          ]
        }
      });
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST Batch Delete Records
  app.post('/api/records/delete-batch', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      const { ids } = req.body;
      if (!Array.isArray(ids) || !ids.length) {
        return res.json({ success: true, count: 0 });
      }

      const sheets = getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:A',
      });

      const rows = response.data.values || [];
      const indicesToDelete: number[] = [];
      rows.forEach((r: any, idx: number) => {
        if (idx > 0 && ids.includes(r[0])) {
          indicesToDelete.push(idx);
        }
      });

      // Sort descending so deletion doesn't shift upcoming indices
      indicesToDelete.sort((a, b) => b - a);

      const spreadSheet = await sheets.spreadsheets.get({ spreadsheetId });
      const sheet = spreadSheet.data.sheets.find((s: any) => s.properties.title === 'Records');
      if (!sheet) throw new Error("Sheet 'Records' tidak ditemukan");

      if (indicesToDelete.length > 0) {
        const requests = indicesToDelete.map((rowIndex) => ({
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
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

      res.json({ success: true, count: indicesToDelete.length });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET Logs
  app.get('/api/logs', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      const sheets = getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Logs!A:D',
      }).catch(() => ({ data: { values: [] } })); // Fail gracefully if Logs sheet doesn't exist
      
      const rows = response.data.values || [];
      const logs = rows.slice(1).map((row: any) => ({
        id: row[0] || '',
        timestamp: row[1] || '',
        action: row[2] || '',
        details: row[3] || '',
      })).filter((l: any) => l.id).reverse(); // Send newest first
      
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST Log
  app.post('/api/logs', async (req, res) => {
    try {
      const spreadsheetId = "1DZDGIAvGU66LPYwGndSJ6Qx9v2eldftmzUbfzalv6oE";
      
      
      const sheets = getSheets();
      const newLog = req.body;
      
      const row = [
        newLog.id,
        newLog.timestamp,
        newLog.action,
        newLog.details
      ];
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Logs!A:D',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] }
      }).catch(() => null); // Ignore error if sheet doesn't exist
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
