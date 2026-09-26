import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Search, Package, Pencil, Trash2, Wallet, Upload, CheckCircle2, RotateCcw, Wallet as WalletIcon, Ban, HeartHandshake, History as HistoryIcon } from 'lucide-react';
import { StockOpnameRecord, ActivityLog } from '../types';
import { StockOpnameForm } from '../components/StockOpnameForm';
import { InstallmentModal } from '../components/InstallmentModal';
import { ClaimPayoffModal } from '../components/ClaimPayoffModal';
import { StockImportModal } from '../components/StockImportModal';
import { HistoryModal } from '../components/HistoryModal';
import { periodSortKey, getPeriodRangeLabel } from '../lib/period';

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

interface StockOpnamePageProps {
  initialBranch?: string;
}

export function StockOpnamePage({ initialBranch }: StockOpnamePageProps = {}) {
  const [records, setRecords] = useState<StockOpnameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState(initialBranch || '');
  const [periodFilter, setPeriodFilter] = useState('');
  const [hideNegative, setHideNegative] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockOpnameRecord | null>(null);
  const [seed, setSeed] = useState<Partial<StockOpnameRecord> | null>(null);
  const [installmentTarget, setInstallmentTarget] = useState<StockOpnameRecord | null>(null);
  const [historyTarget, setHistoryTarget] = useState<StockOpnameRecord | null>(null);
  const [isPayoffOpen, setIsPayoffOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        setIsConfigured(!!d.configured);
        if (d.configured) {
          return fetch('/api/stock').then(r => r.json()).then(data => Array.isArray(data) ? setRecords(data) : setRecords([]));
        }
      })
      .catch(() => setIsConfigured(false))
      .finally(() => setIsLoading(false));
  }, []);

  const addLog = async (action: ActivityLog['action'], details: string) => {
    if (!isConfigured) return;
    const newLog: ActivityLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), action, details };
    try {
      await fetch('/api/stock-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
    } catch { /* log gagal tidak menghentikan alur utama */ }
  };

  const branches = useMemo(() => [...new Set(records.map(r => r.branch).filter(Boolean))].sort(), [records]);
  const periods = useMemo(() => {
    const set = new Set<string>(records.map(r => r.period).filter((p): p is string => Boolean(p)));
    return [...set].sort((a, b) => periodSortKey(b) - periodSortKey(a));
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter(r => {
      if (branchFilter && r.branch !== branchFilter) return false;
      if (periodFilter && r.period !== periodFilter) return false;
      if (hideNegative && r.systemValue < 0) return false;
      if (!q) return true;
      return r.itemName.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.branch.toLowerCase().includes(q);
    });
  }, [records, query, branchFilter, periodFilter, hideNegative]);

  const handleSave = async (data: StockOpnameRecord) => {
    const exists = records.some(r => r.id === data.id);
    setRecords(exists ? records.map(r => r.id === data.id ? data : r) : [data, ...records]);
    setIsFormOpen(false);
    setEditing(null);
    setSeed(null);

    if (exists) {
      addLog('UPDATE', `Update klaim selisih "${data.itemName}" a.n ${data.name} (${data.branch}, periode ${data.period})`);
    } else {
      addLog('CREATE', `Klaim selisih baru "${data.itemName}" a.n ${data.name} (${data.branch}, periode ${data.period})`);
    }

    if (!isConfigured) return;
    try {
      if (exists) {
        await fetch(`/api/stock/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } else {
        await fetch('/api/stock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      }
    } catch {
      alert('Gagal menyimpan ke Spreadsheet.');
    }
  };

  const handleInstallmentSave = (data: StockOpnameRecord) => {
    addLog(
      data.isPaidOff ? 'UPDATE' : 'UPDATE',
      `Update angsuran "${data.itemName}" a.n ${data.name}${data.isPaidOff ? ' — ditandai Lunas/Cukup' : ''}`
    );
    return handleSave(data);
  };

  const handleBulkSettle = async (updated: StockOpnameRecord[], meta: { totalPaid: number; count: number; closed: boolean }) => {
    setRecords(prev => prev.map(r => updated.find(u => u.id === r.id) || r));

    addLog(
      'UPDATE',
      `Pelunasan massal ${meta.count} klaim, total ${formatRupiah(meta.totalPaid)}${meta.closed ? ' — semua ditandai Lunas/Cukup' : ''}`
    );

    if (!isConfigured) return;
    try {
      await Promise.all(updated.map(r =>
        fetch(`/api/stock/${r.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r),
        })
      ));
    } catch {
      alert('Beberapa pembaruan mungkin gagal tersimpan ke Spreadsheet.');
    }
  };

  const handleImport = async (newRecords: StockOpnameRecord[]) => {
    setRecords(prev => [...newRecords, ...prev]);
    addLog('CREATE', `Import ${newRecords.length} klaim selisih stock dari file`);

    if (!isConfigured) return;
    try {
      await fetch('/api/stock-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecords),
      });
    } catch {
      alert('Gagal menyimpan hasil import ke Spreadsheet.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    const target = records.find(r => r.id === id);
    setRecords(records.filter(r => r.id !== id));
    if (target) addLog('DELETE', `Hapus klaim selisih "${target.itemName}" a.n ${target.name}`);
    if (!isConfigured) return;
    try {
      await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    } catch {
      alert('Gagal menghapus dari Spreadsheet.');
    }
  };

  const startNewCycle = (r: StockOpnameRecord) => {
    setSeed({ itemName: r.itemName, branch: r.branch, name: r.name });
    setEditing(null);
    setIsFormOpen(true);
  };

  // "Tidak Diakui" diabaikan total, tidak ikut dihitung sama sekali.
  const recognized = filtered.filter(r => !r.isNotRecognized);
  const notRecognizedCount = filtered.length - recognized.length;
  const totalSystem = recognized.reduce((s, r) => s + r.systemValue, 0);
  const totalClaim = recognized.reduce((s, r) => s + (r.claimValue ?? r.systemValue), 0);
  const totalPaid = recognized.reduce((s, r) => s + r.installments.reduce((a, i) => a + i.amount, 0), 0);
  const openCount = recognized.filter(r => !r.isPaidOff).length;
  // Pengampunan: hanya utk klaim yang "Dianggap Lunas" & punya nilai diklaim -> selisih (sistem - klaim).
  const totalForgiveness = recognized.reduce(
    (s, r) => (r.isPaidOff && r.claimValue !== undefined ? s + (r.systemValue - r.claimValue) : s),
    0
  );

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {!isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 text-center">
          Belum terhubung ke Spreadsheet. Data hanya tersimpan sementara di browser.
        </div>
      )}

      <header className="bg-white border-b border-zinc-200 px-4 py-4 sm:px-6 sticky top-11 z-30">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Package className="w-5 h-5 text-zinc-900" />
          <h1 className="text-lg font-bold text-zinc-900">Selisih Stock Opname</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">Nilai Sistem</p>
            <p className="text-lg font-bold text-zinc-900">{formatRupiah(totalSystem)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">Nilai Diklaim</p>
            <p className="text-lg font-bold text-zinc-900">{formatRupiah(totalClaim)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-emerald-600">Sudah Dibayar</p>
            <p className="text-lg font-bold text-emerald-600">{formatRupiah(totalPaid)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-sky-600">Pengampunan</p>
            <p className="text-lg font-bold text-sky-600">{formatRupiah(totalForgiveness)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-amber-600">Klaim Terbuka</p>
            <p className="text-lg font-bold text-amber-600">{openCount}</p>
            {notRecognizedCount > 0 && (
              <p className="text-[11px] text-zinc-400 mt-0.5">{notRecognizedCount} tidak diakui (di luar total)</p>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari item, nama, atau cabang..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
            />
          </div>
          {branches.length > 0 && (
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
            >
              <option value="">Semua Cabang</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {periods.length > 0 && (
            <select
              value={periodFilter}
              onChange={e => setPeriodFilter(e.target.value)}
              title={periodFilter ? getPeriodRangeLabel(periodFilter) : undefined}
              className="px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
            >
              <option value="">Semua Periode</option>
              {periods.map(p => <option key={p} value={p}>Periode {p}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-600 cursor-pointer whitespace-nowrap select-none">
            <input
              type="checkbox"
              checked={hideNegative}
              onChange={e => setHideNegative(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            Abaikan nilai minus (-)
          </label>
          <button
            onClick={() => setIsImportOpen(true)}
            title="Upload file reconciliation selisih stock"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            onClick={() => setIsPayoffOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 whitespace-nowrap"
          >
            <WalletIcon className="w-3.5 h-3.5" />
            Lunasi
          </button>
          <button
            onClick={() => { setEditing(null); setSeed(null); setIsFormOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Tambah
          </button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-10">Belum ada data selisih stock.</p>
          )}
          {filtered.map(r => {
            const paid = r.installments.reduce((s, i) => s + i.amount, 0);
            const base = r.claimValue ?? r.systemValue;
            const sisa = Math.max(base - paid, 0);
            const forgiveness = r.isPaidOff && r.claimValue !== undefined ? r.systemValue - r.claimValue : 0;
            return (
              <div key={r.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${r.isNotRecognized ? 'border-zinc-200 opacity-60' : 'border-zinc-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-zinc-900 truncate">{r.itemName}</p>
                    <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{r.period}</span>
                    {r.isNotRecognized ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                        <Ban className="w-3 h-3" /> Tidak Diakui
                      </span>
                    ) : r.isPaidOff && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Lunas/Cukup
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{r.name} · {r.branch}{r.qtySelisih ? ` · ${r.qtySelisih} pcs` : ''}</p>
                  {r.isNotRecognized ? (
                    <p className="text-xs text-zinc-400 mt-1">Diabaikan dari total claim (nilai sistem {formatRupiah(r.systemValue)})</p>
                  ) : (
                    <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                      <span className="text-zinc-500">Klaim: <b className="text-zinc-800">{formatRupiah(base)}</b></span>
                      <span className="text-emerald-600">Dibayar: <b>{formatRupiah(paid)}</b></span>
                      {!r.isPaidOff && sisa > 0 && <span className="text-amber-600">Sisa: <b>{formatRupiah(sisa)}</b></span>}
                      {r.isPaidOff && forgiveness !== 0 && (
                        <span className="flex items-center gap-1 text-sky-600">
                          <HeartHandshake className="w-3 h-3" /> Pengampunan: <b>{formatRupiah(forgiveness)}</b>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.historyRaw && (
                    <button
                      onClick={() => setHistoryTarget(r)}
                      title="Lihat history dari file excel untuk item ini"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-indigo-600"
                    >
                      <HistoryIcon className="w-4 h-4" />
                    </button>
                  )}
                  {r.isPaidOff ? (
                    <button
                      onClick={() => startNewCycle(r)}
                      title="Buat klaim baru (siklus baru untuk item ini)"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-blue-600"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setInstallmentTarget(r)}
                      title="Kelola Angsuran"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-emerald-600"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => { setEditing(r); setSeed(null); setIsFormOpen(true); }}
                    title="Edit"
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    title="Hapus"
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {isFormOpen && (
        <StockOpnameForm
          initial={editing}
          seed={seed}
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditing(null); setSeed(null); }}
        />
      )}

      {installmentTarget && (
        <InstallmentModal
          record={installmentTarget}
          onSave={handleInstallmentSave}
          onClose={() => setInstallmentTarget(null)}
        />
      )}

      {isPayoffOpen && (
        <ClaimPayoffModal
          records={records}
          onBulkSettle={handleBulkSettle}
          onClose={() => setIsPayoffOpen(false)}
        />
      )}

      {isImportOpen && (
        <StockImportModal
          onImport={handleImport}
          onClose={() => setIsImportOpen(false)}
        />
      )}

      {historyTarget && (
        <HistoryModal
          record={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}
