import { useMemo, useState } from 'react';
import { X, Search, CheckCircle2 } from 'lucide-react';
import { StockOpnameRecord } from '../types';

interface ClaimPayoffModalProps {
  records: StockOpnameRecord[]; // seluruh data (belum difilter status)
  onBulkSettle: (
    updated: StockOpnameRecord[],
    meta: { totalPaid: number; count: number; closed: boolean }
  ) => void;
  onClose: () => void;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function ClaimPayoffModal({ records, onBulkSettle, onClose }: ClaimPayoffModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'full' | 'manual'>('full');
  const [manualAmount, setManualAmount] = useState('');
  const [markClosed, setMarkClosed] = useState(true);
  const [note, setNote] = useState('');

  const open = useMemo(() => records.filter(r => !r.isPaidOff), [records]);

  const sisaOf = (r: StockOpnameRecord) => {
    const base = r.claimValue ?? r.systemValue;
    const paid = r.installments.reduce((s, i) => s + i.amount, 0);
    return Math.max(base - paid, 0);
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, StockOpnameRecord[]>();
    for (const r of open) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      if (!map.has(r.name)) map.set(r.name, []);
      map.get(r.name)!.push(r);
    }
    return [...map.entries()]
      .map(([name, items]) => ({ name, items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [open, query]);

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGroup = (items: StockOpnameRecord[]) => {
    const ids = items.map(i => i.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const selectedRecords = open.filter(r => selectedIds.includes(r.id));
  const selectedTotal = selectedRecords.reduce((s, r) => {
    return s + (mode === 'full' ? sisaOf(r) : Number(manualAmount) || 0);
  }, 0);

  const handleConfirm = () => {
    if (!selectedIds.length) return;
    const amountFor = (r: StockOpnameRecord) => mode === 'full' ? sisaOf(r) : Number(manualAmount) || 0;

    const updated = selectedRecords.map(r => {
      const amt = amountFor(r);
      const installments = amt > 0
        ? [...r.installments, { id: crypto.randomUUID(), date: paymentDate, amount: amt, note: note || 'Pelunasan massal' }]
        : r.installments;
      return { ...r, installments, isPaidOff: markClosed ? true : r.isPaidOff };
    });

    onBulkSettle(updated, { totalPaid: selectedTotal, count: updated.length, closed: markClosed });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900">Lunasi Klaim Selisih Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-zinc-200">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama karyawan..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>
          <label className="flex items-center gap-2 text-sm bg-zinc-50 rounded-lg p-2.5 cursor-pointer mt-3">
            <input
              type="checkbox"
              checked={markClosed}
              onChange={e => setMarkClosed(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 accent-emerald-600"
            />
            <span className="font-medium text-zinc-800">Tandai Lunas/Cukup (tutup siklus)</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {groups.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              {open.length === 0 ? 'Tidak ada klaim yang masih terbuka.' : 'Tidak ada karyawan yang cocok.'}
            </p>
          )}
          {groups.map(group => {
            const ids = group.items.map(i => i.id);
            const allSelected = ids.every(id => selectedIds.includes(id));
            return (
              <div key={group.name} className="border border-zinc-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleGroup(group.items)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                    allSelected ? 'bg-emerald-50' : 'bg-zinc-50 hover:bg-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${allSelected ? 'text-emerald-600' : 'text-zinc-300'}`} />
                    <span className="font-semibold text-sm text-zinc-900">{group.name}</span>
                    <span className="text-xs text-zinc-500">({group.items.length} klaim terbuka)</span>
                  </div>
                </button>
                <div className="divide-y divide-zinc-100">
                  {group.items.map(item => (
                    <label key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
                      />
                      <span className="flex-1 text-zinc-600 truncate">
                        {item.itemName} · {item.branch} <span className="text-zinc-400">({item.period})</span>
                      </span>
                      <span className="text-zinc-900 font-medium whitespace-nowrap">{formatRupiah(sisaOf(item))}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-zinc-200 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Kebijakan Bayar</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('full')}
                className={`px-3 py-2 text-sm rounded-lg border ${mode === 'full' ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600'}`}
              >
                Lunasi Penuh (sisa)
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`px-3 py-2 text-sm rounded-lg border ${mode === 'manual' ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600'}`}
              >
                Nominal Manual
              </button>
            </div>
          </div>

          {mode === 'manual' && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Jumlah Bayar per Item (Rp)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={e => setManualAmount(e.target.value)}
                placeholder="Berlaku sama untuk semua item terpilih"
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Tanggal Bayar</label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Catatan</label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="opsional"
                className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Kalau "Tandai Lunas/Cukup" dicentang (atas), item terpilih ditutup. Selisih baru untuk item yang sama nanti dicatat sebagai klaim baru, bukan menambah ke sini.
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="text-sm">
              <span className="text-zinc-500">{selectedIds.length} dipilih · </span>
              <span className="font-bold text-zinc-900">{formatRupiah(selectedTotal)}</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0 || (mode === 'manual' && !manualAmount)}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proses
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
