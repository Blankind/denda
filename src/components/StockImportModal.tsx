import { useMemo, useState } from 'react';
import { X, Upload, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { StockOpnameRecord } from '../types';
import { parseStockRevisionFile, ParsedStockRow } from '../lib/parseStockRevision';

interface StockImportModalProps {
  onImport: (records: StockOpnameRecord[]) => void;
  onClose: () => void;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

const mostCommonPeriod = (rows: ParsedStockRow[]) => {
  const count = new Map<string, number>();
  for (const r of rows) if (r.period) count.set(r.period, (count.get(r.period) || 0) + 1);
  let best = '';
  let bestN = 0;
  for (const [p, n] of count) if (n > bestN) { best = p; bestN = n; }
  return best || new Date().toISOString().slice(0, 7);
};

export function StockImportModal({ onImport, onClose }: StockImportModalProps) {
  const [rows, setRows] = useState<ParsedStockRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [period, setPeriod] = useState('');
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setIsParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseStockRevisionFile(file);
      if (!parsed.length) {
        setError('Tidak ada baris item yang terbaca dari file ini.');
        setRows(null);
      } else {
        setRows(parsed);
        setPeriod(mostCommonPeriod(parsed));
      }
    } catch (e: any) {
      setError(e?.message || 'Gagal membaca file.');
      setRows(null);
    } finally {
      setIsParsing(false);
    }
  };

  const missingPicCount = useMemo(() => rows?.filter(r => !r.name).length || 0, [rows]);
  const totalValue = useMemo(() => rows?.reduce((s, r) => s + r.systemValue, 0) || 0, [rows]);

  const handleConfirm = () => {
    if (!rows || !rows.length) return;
    setIsSaving(true);
    const now = new Date().toISOString();
    const records: StockOpnameRecord[] = rows.map(r => ({
      id: crypto.randomUUID(),
      createdAt: now,
      period: period || r.period,
      itemName: r.itemName,
      branch: r.branch,
      name: r.name || '(belum ada PIC)',
      qtySelisih: r.qtySelisih,
      systemValue: r.systemValue,
      claimValue: undefined,
      installments: [],
      isPaidOff: false,
      isNotRecognized: false,
      description: `Import dari file reconciliation${fileName ? ` (${fileName})` : ''}${r.sourceCase === 'NEW_CASE' ? ' — nilai case terakhir' : ''}`,
      historyRaw: r.historyRaw || undefined,
    }));
    onImport(records);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900">Upload File Selisih Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!rows && (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 rounded-xl py-10 cursor-pointer hover:border-zinc-400 hover:bg-zinc-50">
              <Upload className="w-6 h-6 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-700">
                {isParsing ? 'Membaca file...' : 'Pilih file reconciliation (.xlsx)'}
              </span>
              <span className="text-xs text-zinc-400">Kolom: Warehouse, Item Name, History Reconciliation, Netto Akhir, Value</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={isParsing}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {rows && (
            <>
              <div className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-lg p-3">
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="truncate">{fileName}</span>
                <span className="ml-auto shrink-0 font-medium text-zinc-900">{rows.length} item</span>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                Untuk item dengan riwayat OLD CASE + NEW CASE, nilai yang dipakai hanya total case
                terakhir (bukan akumulasi). Khusus nilai Rupiah (Value): sistem negatif otomatis
                dibalik jadi positif (ditagih), positif dibalik jadi negatif (pengurang). Qty tetap
                apa adanya, tidak dibalik.
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Periode Klaim (berlaku untuk semua item)</label>
                <input
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>

              {missingPicCount > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{missingPicCount} item tidak punya nama PIC di riwayatnya, ditandai "(belum ada PIC)" — lengkapi manual lewat Edit setelah import.</span>
                </div>
              )}

              <div className="border border-zinc-200 rounded-xl overflow-hidden">
                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100">
                  {rows.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-800 truncate">{r.itemName}</p>
                        <p className="text-zinc-400 truncate">{r.branch} · {r.name || 'tanpa PIC'} · qty {r.qtySelisih}</p>
                      </div>
                      <span className={`font-semibold whitespace-nowrap ${r.systemValue >= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatRupiah(r.systemValue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm pt-1">
                <span className="text-zinc-500">Total nilai klaim (sistem)</span>
                <span className="font-bold text-zinc-900">{formatRupiah(totalValue)}</span>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg">
            Batal
          </button>
          {rows && (
            <button
              onClick={handleConfirm}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? 'Menyimpan...' : `Import ${rows.length} Item`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
