import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
});

function parseExcelTsv(rawText: string) {
  const lines = rawText.split(/\r?\n/);
  const records: any[] = [];
  let currentBranch = 'KREMBUNG';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(GUDANG\s+\d+|KREMBUNG|GUDANG\s+[A-Za-z0-9_-]+)/i.test(trimmed) && !trimmed.includes('\t')) {
      currentBranch = trimmed.toUpperCase();
      continue;
    }
    const parts = line.split('\t');
    if (parts.length > 0 && /^(GUDANG\s+\d+|KREMBUNG)/i.test(parts[0].trim()) && parts.slice(1).every((p) => !p.trim())) {
      currentBranch = parts[0].trim().toUpperCase();
      continue;
    }

    if (
      trimmed.toUpperCase().includes('TOTAL KLAIM') ||
      (parts[0].trim() === '' && parts.some((p) => p.toUpperCase().includes('KURANG MUAT') || p.toUpperCase().includes('SALAH MUAT')))
    ) continue;

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

      let rawAmount = '';
      for (let i = parts.length - 1; i >= 1; i--) {
        const p = (parts[i] || '').trim();
        const digitsOnly = p.replace(/[^\d]/g, '');
        if (digitsOnly && digitsOnly.length >= 4) { rawAmount = digitsOnly; break; }
      }
      if (!rawAmount) rawAmount = (parts[7] || parts[parts.length - 1] || '').replace(/[^\d]/g, '');
      const amount = Number(rawAmount) || 50000;

      let name = pic || customer || 'Tanpa Nama';
      if (pic && customer && !pic.includes(customer)) name = `${pic} (${customer})`;

      let description = problem;
      if (note) description = problem ? `${problem} - ${note}` : note;

      let documentDetail = itemDesc;
      if (qty) documentDetail = `${itemDesc} [Qty: ${qty}]`;

      let rowBranch = currentBranch;
      if (/KREMBUNG/i.test(line)) rowBranch = 'KREMBUNG';
      else if (/GUDANG\s*2/i.test(line)) rowBranch = 'GUDANG 2';
      else if (/GUDANG\s*1/i.test(line)) rowBranch = 'GUDANG 1';

      records.push({ date: isoDate, branch: rowBranch, name, amount, description: description || '-', documentDetail: documentDetail || '-' });
    }
  }
  return records;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) return res.status(400).json({ error: 'Teks kosong atau tidak ditemukan.' });

    const directRecords = parseExcelTsv(rawText);
    if (directRecords.length > 0) return res.json({ success: true, records: directRecords });

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
      model: 'gemini-2.0-flash',
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

    let parsedData: any = {};
    try { parsedData = JSON.parse(response.text || '{"records":[]}'); } catch { parsedData = { records: [] }; }

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

    return res.json({ success: true, records: cleaned });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Gagal memproses teks.' });
  }
}
