import { useMemo, useState } from 'react';
import { X, Search, CheckCircle2 } from 'lucide-react';
import { PenaltyRecord } from '../types';

interface PayoffModalProps {
  records: PenaltyRecord[]; // seluruh data (belum difilter status)
  onBulkPay: (ids: string[], paymentDate?: string, destinationAccount?: 'TACIK' | 'KOORDINATOR') => void;
  onClose: () => void;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function PayoffModal({ records, onBulkPay, onClose }: PayoffModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [destinationAccount, setDestinationAccount] = useState<'TACIK' | 'KOORDINATOR'>('TACIK');

  const unpaid = useMemo(() => records.filter(r => r.status !== 'PAID'), [records]);

  // Kelompokkan per nama supaya mudah dicari & dipilih sekaligus
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, PenaltyRecord[]>();
    for (const r of unpaid) {
      if (q && !r.name.toLowerCase().includes(q)) continue;
      const key = r.name.trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        total: items.reduce((s, r) => s + r.amount, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [unpaid, query]);

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGroup = (items: PenaltyRecord[]) => {
    const ids = items.map(i => i.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev =>
      allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]
    );
  };

  const selectedTotal = useMemo(
    () => unpaid.filter(r => selectedIds.includes(r.id)).reduce((s, r) => s + r.amount, 0),
    [unpaid, selectedIds]
  );

  const handleConfirm = () => {
    if (!selectedIds.length) return;
    onBulkPay(selectedIds, paymentDate, destinationAccount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900">Lunasi Denda</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
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
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {groups.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-8">
              {unpaid.length === 0 ? 'Tidak ada denda yang belum lunas.' : 'Tidak ada karyawan yang cocok.'}
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
                    <span className="text-xs text-zinc-500">({group.items.length} denda)</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">{formatRupiah(group.total)}</span>
                </button>
                <div className="divide-y divide-zinc-100">
                  {group.items.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                        className="w-4 h-4 rounded border-zinc-300 accent-zinc-900"
                      />
                      <span className="flex-1 text-zinc-600 truncate">{item.description || item.branch}</span>
                      <span className="text-zinc-900 font-medium whitespace-nowrap">{formatRupiah(item.amount)}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: opsi & aksi */}
        <div className="p-4 border-t border-zinc-200 space-y-3">
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
              <label className="block text-xs font-medium text-zinc-500 mb-1">Uang Masuk</label>
              <select
                value={destinationAccount}
                onChange={e => setDestinationAccount(e.target.value as 'TACIK' | 'KOORDINATOR')}
                className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              >
                <option value="TACIK">TACIK</option>
                <option value="KOORDINATOR">KOORDINATOR</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-sm">
              <span className="text-zinc-500">{selectedIds.length} dipilih · </span>
              <span className="font-bold text-zinc-900">{formatRupiah(selectedTotal)}</span>
            </div>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Lunasi Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
