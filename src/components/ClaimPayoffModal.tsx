import { useMemo, useState } from 'react';
import { X, Search, CheckCircle2, Building2, ListChecks, AlertTriangle } from 'lucide-react';
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

const sisaOf = (r: StockOpnameRecord) => {
  const base = r.claimValue ?? r.systemValue;
  const paid = r.installments.reduce((s, i) => s + i.amount, 0);
  return Math.max(base - paid, 0);
};

export function ClaimPayoffModal({ records, onBulkSettle, onClose }: ClaimPayoffModalProps) {
  const [tab, setTab] = useState<'branch' | 'manual'>('branch');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [markClosed, setMarkClosed] = useState(true);
  const [note, setNote] = useState('');

  const open = useMemo(
    () => records.filter(r => !r.isPaidOff && !r.isNotRecognized && (r.qtySelisih ?? 0) !== 0),
    [records]
  );

  // Daftar opsi untuk filter (dari seluruh klaim terbuka)
  const allBranches = useMemo(() => [...new Set(open.map(r => r.branch).filter(Boolean))].sort(), [open]);
  const allItemGroups = useMemo(() => [...new Set(open.map(r => r.itemGroup).filter((g): g is string => Boolean(g)))].sort(), [open]);

  // ---------- MODE: BAYAR PER CABANG (auto-alokasi ke klaim terbuka, tertua dulu) ----------
  const [branchGroupFilter, setBranchGroupFilter] = useState('');
  const [branchItemGroupFilter, setBranchItemGroupFilter] = useState('');

  const branchGroups = useMemo(() => {
    const filtered = open.filter(r => {
      if (branchGroupFilter && r.branch !== branchGroupFilter) return false;
      if (branchItemGroupFilter && r.itemGroup !== branchItemGroupFilter) return false;
      return true;
    });
    const map = new Map<string, StockOpnameRecord[]>();
    for (const r of filtered) {
      if (!map.has(r.branch)) map.set(r.branch, []);
      map.get(r.branch)!.push(r);
    }
    return [...map.entries()]
      .map(([branch, items]) => {
        const sorted = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return { branch, items: sorted, totalSisa: sorted.reduce((s, r) => s + sisaOf(r), 0) };
      })
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [open, branchGroupFilter, branchItemGroupFilter]);

  const [branchSelected, setBranchSelected] = useState('');
  const [branchAmount, setBranchAmount] = useState('');

  const activeBranchGroup = branchGroups.find(g => g.branch === branchSelected);

  // Kalau cabang yang lagi dipilih hilang setelah filter berubah, reset pilihan.
  if (branchSelected && !activeBranchGroup) {
    setBranchSelected('');
  }

  const allocation = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeBranchGroup) return map;
    let remaining = Number(branchAmount) || 0;
    for (const item of activeBranchGroup.items) {
      if (remaining <= 0) break;
      const sisa = sisaOf(item);
      if (sisa <= 0) continue;
      const applied = Math.min(sisa, remaining);
      map.set(item.id, applied);
      remaining -= applied;
    }
    return map;
  }, [activeBranchGroup, branchAmount]);

  const allocatedTotal = [...allocation.values()].reduce((s, v) => s + v, 0);
  const overpaid = activeBranchGroup ? Math.max((Number(branchAmount) || 0) - activeBranchGroup.totalSisa, 0) : 0;

  const handleConfirmBranch = () => {
    if (!activeBranchGroup || allocation.size === 0) return;
    const updated = activeBranchGroup.items
      .filter(item => allocation.has(item.id))
      .map(item => {
        const amt = allocation.get(item.id)!;
        const fullySettled = amt >= sisaOf(item);
        const installments = amt > 0
          ? [...item.installments, { id: crypto.randomUUID(), date: paymentDate, amount: amt, note: note || `Pelunasan cabang ${item.branch}` }]
          : item.installments;
        return { ...item, installments, isPaidOff: fullySettled || markClosed ? true : item.isPaidOff };
      });
    onBulkSettle(updated, { totalPaid: allocatedTotal, count: updated.length, closed: markClosed });
    onClose();
  };

  // ---------- MODE: PILIH ITEM MANUAL (untuk selesaikan 1 selisih item spesifik) ----------
  const [query, setQuery] = useState('');
  const [manualBranchFilter, setManualBranchFilter] = useState('');
  const [manualItemGroupFilter, setManualItemGroupFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [manualMode, setManualMode] = useState<'full' | 'nominal'>('full');
  const [manualAmount, setManualAmount] = useState('');

  const manualGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const map = new Map<string, StockOpnameRecord[]>();
    for (const r of open) {
      if (manualBranchFilter && r.branch !== manualBranchFilter) continue;
      if (manualItemGroupFilter && r.itemGroup !== manualItemGroupFilter) continue;
      if (q && !(r.itemName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.branch.toLowerCase().includes(q) || (r.itemGroup || '').toLowerCase().includes(q))) continue;
      if (!map.has(r.branch)) map.set(r.branch, []);
      map.get(r.branch)!.push(r);
    }
    return [...map.entries()]
      .map(([branch, items]) => ({ branch, items: items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)) }))
      .sort((a, b) => a.branch.localeCompare(b.branch));
  }, [open, query, manualBranchFilter, manualItemGroupFilter]);

  const toggleOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGroup = (items: StockOpnameRecord[]) => {
    const ids = items.map(i => i.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
  };

  const selectedRecords = open.filter(r => selectedIds.includes(r.id));
  const manualSelectedTotal = selectedRecords.reduce((s, r) => {
    return s + (manualMode === 'full' ? sisaOf(r) : Number(manualAmount) || 0);
  }, 0);

  const handleConfirmManual = () => {
    if (!selectedIds.length) return;
    const amountFor = (r: StockOpnameRecord) => manualMode === 'full' ? sisaOf(r) : Number(manualAmount) || 0;

    const updated = selectedRecords.map(r => {
      const amt = amountFor(r);
      const installments = amt > 0
        ? [...r.installments, { id: crypto.randomUUID(), date: paymentDate, amount: amt, note: note || 'Pelunasan item spesifik' }]
        : r.installments;
      return { ...r, installments, isPaidOff: markClosed ? true : r.isPaidOff };
    });

    onBulkSettle(updated, { totalPaid: manualSelectedTotal, count: updated.length, closed: markClosed });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[92vh] max-h-[820px] flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 shrink-0">
          <h2 className="text-base font-bold text-zinc-900">Lunasi Klaim Selisih Stock</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-2.5 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 bg-zinc-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('branch')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'branch' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Building2 className="w-4 h-4" /> Bayar Cabang
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === 'manual' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <ListChecks className="w-4 h-4" /> Item Spesifik
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1 leading-snug line-clamp-1">
            {tab === 'branch'
              ? 'Pilih cabang & nominal — sistem otomatis alokasikan ke klaim terbuka (tertua dulu).'
              : 'Selesaikan selisih 1 item tertentu saja, terlepas dari klaim lain di cabang yang sama.'}
          </p>
        </div>

        {/* ===== TAB: BAYAR CABANG ===== */}
        {tab === 'branch' && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 space-y-2.5">
              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Filter Cabang</label>
                  <select
                    value={branchGroupFilter}
                    onChange={e => setBranchGroupFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">Semua cabang</option>
                    {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Filter Item Group</label>
                  <select
                    value={branchItemGroupFilter}
                    onChange={e => setBranchItemGroupFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">Semua item group</option>
                    {allItemGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Cabang</label>
                  <select
                    value={branchSelected}
                    onChange={e => setBranchSelected(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="">Pilih cabang...</option>
                    {branchGroups.map(g => (
                      <option key={g.branch} value={g.branch}>
                        {g.branch} · {g.items.length} klaim terbuka
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Nominal Dibayar (Rp)</label>
                  <input
                    type="number"
                    value={branchAmount}
                    onChange={e => setBranchAmount(e.target.value)}
                    placeholder="cth. 5000000"
                    disabled={!branchSelected}
                    className="w-full px-2.5 py-1.5 text-sm border border-zinc-300 rounded-lg disabled:bg-zinc-50 disabled:text-zinc-400"
                  />
                </div>
              </div>

              {activeBranchGroup && (
                <div className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5">
                  Total sisa terbuka di <b className="text-zinc-700">{activeBranchGroup.branch}</b>
                  {branchItemGroupFilter ? <> (item group <b className="text-zinc-700">{branchItemGroupFilter}</b>)</> : ''}: {formatRupiah(activeBranchGroup.totalSisa)}
                </div>
              )}

              {overpaid > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Nominal melebihi total sisa cabang ini sebesar {formatRupiah(overpaid)}. Kelebihan tidak dialokasikan kemana pun — sesuaikan nominal kalau perlu.</span>
                </div>
              )}

              {activeBranchGroup && allocation.size > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 mb-1">Alokasi otomatis ({allocation.size} item terdampak)</p>
                  <div className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden">
                    {activeBranchGroup.items.filter(i => allocation.has(i.id)).map(item => {
                      const applied = allocation.get(item.id)!;
                      const sisa = sisaOf(item);
                      const full = applied >= sisa;
                      return (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                          <span className="flex-1 min-w-0 truncate text-zinc-700">
                            {item.itemName} <span className="text-zinc-400">· {item.name} · {item.period}</span>
                          </span>
                          <span className={`font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${full ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {full ? 'Lunas' : 'Sebagian'}
                          </span>
                          <span className="font-medium text-zinc-900 whitespace-nowrap">{formatRupiah(applied)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {branchSelected && allocation.size === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Masukkan nominal untuk melihat alokasinya.</p>
              )}
            </div>

            <div className="px-4 py-3 border-t border-zinc-200 space-y-2 shrink-0">
              <label className="flex items-center gap-2 text-xs bg-zinc-50 rounded-lg px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markClosed}
                  onChange={e => setMarkClosed(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 accent-emerald-600"
                />
                <span className="font-medium text-zinc-800">Tandai lunas walau sisa belum 0 (pengampunan sisa terakhir)</span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Catatan</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="opsional"
                    className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="text-xs">
                  <span className="text-zinc-500">{allocation.size} item terdampak · </span>
                  <span className="font-bold text-zinc-900">{formatRupiah(allocatedTotal)}</span>
                </div>
                <button
                  onClick={handleConfirmBranch}
                  disabled={allocation.size === 0}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Proses Pelunasan Cabang
                </button>
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: ITEM SPESIFIK (manual, seperti sebelumnya) ===== */}
        {tab === 'manual' && (
          <>
            <div className="px-4 py-2.5 border-b border-zinc-200 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Cari item, item group, PIC, atau cabang..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <select
                  value={manualBranchFilter}
                  onChange={e => setManualBranchFilter(e.target.value)}
                  className="w-40 shrink-0 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">Semua cabang</option>
                  {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select
                  value={manualItemGroupFilter}
                  onChange={e => setManualItemGroupFilter(e.target.value)}
                  className="w-40 shrink-0 px-2 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="">Semua item group</option>
                  {allItemGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2.5 space-y-2.5">
              {manualGroups.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  {open.length === 0 ? 'Tidak ada klaim yang masih terbuka.' : 'Tidak ada item yang cocok.'}
                </p>
              )}
              {manualGroups.map(group => {
                const ids = group.items.map(i => i.id);
                const allSelected = ids.every(id => selectedIds.includes(id));
                return (
                  <div key={group.branch} className="border border-zinc-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group.items)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                        allSelected ? 'bg-emerald-50' : 'bg-zinc-50 hover:bg-zinc-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={`w-4 h-4 ${allSelected ? 'text-emerald-600' : 'text-zinc-300'}`} />
                        <span className="font-semibold text-sm text-zinc-900">{group.branch}</span>
                        <span className="text-xs text-zinc-500">({group.items.length} klaim terbuka)</span>
                      </div>
                    </button>
                    <div className="divide-y divide-zinc-100">
                      {group.items.map(item => (
                        <label key={item.id} className="flex items-center gap-2.5 px-3 py-1.5 text-xs cursor-pointer hover:bg-zinc-50">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleOne(item.id)}
                            className="w-3.5 h-3.5 rounded border-zinc-300 accent-zinc-900 shrink-0"
                          />
                          <span className="flex-1 min-w-0 text-zinc-600 truncate">
                            {item.itemName} <span className="text-zinc-400">{item.itemGroup ? `· ${item.itemGroup} ` : ''}· {item.name} · {item.period}</span>
                          </span>
                          <span className="text-zinc-900 font-medium whitespace-nowrap">{formatRupiah(sisaOf(item))}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-zinc-200 space-y-2 shrink-0">
              <label className="flex items-center gap-2 text-xs bg-zinc-50 rounded-lg px-2.5 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markClosed}
                  onChange={e => setMarkClosed(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 accent-emerald-600"
                />
                <span className="font-medium text-zinc-800">Tandai Lunas/Cukup (tutup siklus)</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Kebijakan Bayar</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualMode('full')}
                    className={`px-3 py-1.5 text-xs rounded-lg border ${manualMode === 'full' ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600'}`}
                  >
                    Lunasi Penuh (sisa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualMode('nominal')}
                    className={`px-3 py-1.5 text-xs rounded-lg border ${manualMode === 'nominal' ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-300 text-zinc-600'}`}
                  >
                    Nominal Manual
                  </button>
                </div>
              </div>

              {manualMode === 'nominal' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Jumlah Bayar per Item (Rp)</label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    placeholder="Berlaku sama untuk semua item terpilih"
                    className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Catatan</label>
                  <input
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="opsional"
                    className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <div className="text-xs">
                  <span className="text-zinc-500">{selectedIds.length} dipilih · </span>
                  <span className="font-bold text-zinc-900">{formatRupiah(manualSelectedTotal)}</span>
                </div>
                <button
                  onClick={handleConfirmManual}
                  disabled={selectedIds.length === 0 || (manualMode === 'nominal' && !manualAmount)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Proses
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
