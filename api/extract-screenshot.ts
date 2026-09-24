import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Gambar atau screenshot tidak ditemukan.' });

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

    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
    let lastError: any = null;
    let response: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                { inlineData: { mimeType: cleanMimeType, data: cleanBase64 } },
                { text: prompt },
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
          break;
        }
      }
      if (response && response.text) break;
    }

    if (!response || !response.text) throw lastError || new Error('Model AI sedang sibuk. Coba lagi sebentar.');

    let parsedData: any = {};
    try { parsedData = JSON.parse(response.text); } catch { parsedData = { records: [] }; }

    const recordsList = Array.isArray(parsedData.records) ? parsedData.records : (parsedData.name ? [parsedData] : []);
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
    const is503 = error?.message?.includes('503') || error?.message?.includes('high demand') || error?.message?.includes('UNAVAILABLE');
    const errorMsg = is503
      ? 'Server AI Gemini sedang sibuk (503). Silakan coba lagi.'
      : (error.message || 'Gagal mengekstrak data dari gambar.');
    return res.status(500).json({ error: errorMsg });
  }
}
