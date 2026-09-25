// Parser untuk file "Laporan Reconciliation" (sheet berisi kolom:
// Warehouse | Item Name | History Reconciliation | Netto Akhir | Value).
//
// Aturan:
// 1. Kalau 1 item punya banyak history dalam 1 case yang sama (tanpa label
//    OLD CASE/NEW CASE) -> Netto Akhir & Value di baris item sudah final,
//    dipakai apa adanya.
// 2. Kalau item punya split "OLD CASE" + "NEW CASE" (case lama sudah selesai,
//    lalu ada selisih baru) -> HANYA total NEW CASE (case terakhir) yang
//    dipakai, bukan akumulasi OLD+NEW seperti yang tertulis di baris item.
// 3. Sign flip: netto/value negatif (sistem kurang) -> jadi positif (nilai
//    yang diklaimkan/ditagih). netto/value positif (sistem lebih) -> jadi
//    negatif (pengurang/kredit).

export interface ParsedStockRow {
  branch: string;
  itemName: string;
  qtySelisih: number; // sudah di-flip tanda
  systemValue: number; // sudah di-flip tanda
  name: string; // PIC, diambil dari tag 👤 terakhir pada case yang dipakai; '' kalau tidak ada
  period: string; // YYYY-MM, dari tanggal terakhir pada case yang dipakai
  sourceCase: 'SINGLE' | 'NEW_CASE'; // info saja, untuk preview
  rawNetto: number; // sebelum flip, untuk transparansi di preview
  rawValue: number; // sebelum flip
}

// "433.380,48" -> 433380.48 | "9,500" -> 9.5 | "-3" -> -3
function parseIndoNumber(raw: string): number {
  const cleaned = raw.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const CASE_TOTAL_RE = /CASE TOTAL NETTO:\s*([+\-]?[\d.,]+)\s*\|\s*VALUE:\s*([+\-]?[\d.,]+)\)/g;
const PIC_RE = /👤\s*([^\s|]+)/g;
const DATE_RE = /(\d{4}-\d{2}-\d{2})/g;

function lastMatch(re: RegExp, text: string): RegExpMatchArray | undefined {
  re.lastIndex = 0;
  let m: RegExpMatchArray | null;
  let last: RegExpMatchArray | undefined;
  while ((m = re.exec(text))) last = m;
  return last;
}

function findHeaderIndexes(header: any[]) {
  const norm = (v: any) => String(v ?? '').trim().toLowerCase();
  const idx = (name: string) => header.findIndex(h => norm(h) === name);
  return {
    branch: idx('warehouse'),
    item: idx('item name'),
    history: idx('history reconciliation'),
    netto: idx('netto akhir'),
    value: idx('value'),
  };
}

/** rows = hasil XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) */
export function parseStockRevisionRows(rows: any[][]): ParsedStockRow[] {
  if (!rows.length) return [];
  const cols = findHeaderIndexes(rows[0]);
  if (cols.branch === -1 || cols.item === -1 || cols.history === -1) {
    throw new Error('Format file tidak dikenali. Kolom Warehouse / Item Name / History Reconciliation tidak ditemukan.');
  }

  type Block = { branch: string; itemName: string; lines: string[]; rawNetto: number; rawValue: number };
  const blocks: Block[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] || [];
    const branch = row[cols.branch];
    const historyText = row[cols.history] != null ? String(row[cols.history]) : '';

    if (branch) {
      blocks.push({
        branch: String(branch),
        itemName: String(row[cols.item] ?? ''),
        lines: historyText ? [historyText] : [],
        rawNetto: cols.netto !== -1 ? Number(row[cols.netto] ?? 0) : 0,
        rawValue: cols.value !== -1 ? Number(row[cols.value] ?? 0) : 0,
      });
    } else if (blocks.length && historyText) {
      blocks[blocks.length - 1].lines.push(historyText);
    }
  }

  return blocks
    .filter(b => b.itemName)
    .map(b => {
      const text = b.lines.join('\n');
      const totalMatch = lastMatch(CASE_TOTAL_RE, text);

      let rawNetto = b.rawNetto;
      let rawValue = b.rawValue;
      let sourceCase: ParsedStockRow['sourceCase'] = 'SINGLE';

      if (totalMatch) {
        rawNetto = parseIndoNumber(totalMatch[1]);
        rawValue = parseIndoNumber(totalMatch[2]);
        sourceCase = 'NEW_CASE';
      }

      const picMatch = lastMatch(PIC_RE, text);
      const dateMatch = lastMatch(DATE_RE, text);

      return {
        branch: b.branch,
        itemName: b.itemName,
        qtySelisih: -rawNetto,
        systemValue: -rawValue,
        name: picMatch ? picMatch[1] : '',
        period: dateMatch ? dateMatch[1].slice(0, 7) : '',
        sourceCase,
        rawNetto,
        rawValue,
      };
    });
}

export async function parseStockRevisionFile(file: File): Promise<ParsedStockRow[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  // Cari sheet yang punya kolom "History Reconciliation"; fallback ke sheet pertama.
  let sheetName = wb.SheetNames.find(n => {
    const ws = wb.Sheets[n];
    const firstRow: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, range: 0 })[0] as any[] || [];
    return firstRow.some(h => String(h ?? '').toLowerCase().trim() === 'history reconciliation');
  });
  if (!sheetName) sheetName = wb.SheetNames[0];

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  return parseStockRevisionRows(rows);
}
