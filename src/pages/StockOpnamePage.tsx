import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Search, Package, Pencil, Trash2, Wallet, Upload, CheckCircle2 } from 'lucide-react';
import { StockOpnameRecord } from '../types';
import { StockOpnameForm } from '../components/StockOpnameForm';
import { InstallmentModal } from '../components/InstallmentModal';

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function StockOpnamePage() {
  const [records, setRecords] = useState<StockOpnameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);
  const [query, setQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockOpnameRecord | null>(null);
  const [installmentTarget, setInstallmentTarget] = useState<StockOpnameRecord | null>(null);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        setIsConfigured(!!d.configured);
        if (d.configured) {
          return fetch('/api/stock')
            .then(r => r.json())
            .then(data => Array.isArray(data) ? setRecords(data) : setRecords([]));
        }
      })
      .catch(() => setIsConfigured(false))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r =>
      r.itemName.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.branch.toLowerCase().includes(q)
    );
  }, [records, query]);

  const handleSave = async (data: StockOpnameRecord) => {
    const exists = records.some(r => r.id === data.id);
    setRecords(exists ? records.map(r => r.id === data.id ? data : r) : [data, ...records]);
    setIsFormOpen(false);
    setEditing(null);

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

  const handleInstallmentSave = (data: StockOpnameRecord) => handleSave(data);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus data ini?')) return;
    setRecords(records.filter(r => r.id !== id));
    if (!isConfigured) return;
    try {
      await fetch(`/api/stock/${id}`, { method: 'DELETE' });
    } catch {
      alert('Gagal menghapus dari Spreadsheet.');
    }
  };

  const totalSystem = filtered.reduce((s, r) => s + r.systemValue, 0);
  const totalClaim = filtered.reduce((s, r) => s + (r.claimValue ?? r.systemValue), 0);
  const totalPaid = filtered.reduce((s, r) => s + r.installments.reduce((a, i) => a + i.amount, 0), 0);

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

      <header className="bg-white border-b border-zinc-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <Package className="w-5 h-5 text-zinc-900" />
          <h1 className="text-lg font-bold text-zinc-900">Selisih Stock Opname</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Ringkasan */}
        <div className="grid grid-cols-3 gap-3">
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
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari item, nama, atau cabang..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white"
            />
          </div>
          <button
            disabled
            title="Segera hadir: upload data selisih dari file"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-white border border-zinc-200 text-zinc-400 rounded-lg cursor-not-allowed whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File
          </button>
          <button
            onClick={() => { setEditing(null); setIsFormOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 whitespace-nowrap"
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
            return (
              <div key={r.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-zinc-900 truncate">{r.itemName}</p>
                    {r.isPaidOff && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Lunas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{r.name} · {r.branch}{r.qtySelisih ? ` · ${r.qtySelisih} pcs` : ''}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-zinc-500">Klaim: <b className="text-zinc-800">{formatRupiah(base)}</b></span>
                    <span className="text-emerald-600">Dibayar: <b>{formatRupiah(paid)}</b></span>
                    {!r.isPaidOff && sisa > 0 && <span className="text-amber-600">Sisa: <b>{formatRupiah(sisa)}</b></span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setInstallmentTarget(r)}
                    title="Kelola Angsuran"
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-emerald-600"
                  >
                    <Wallet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditing(r); setIsFormOpen(true); }}
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
          onSave={handleSave}
          onClose={() => { setIsFormOpen(false); setEditing(null); }}
        />
      )}

      {installmentTarget && (
        <InstallmentModal
          record={installmentTarget}
          onSave={handleInstallmentSave}
          onClose={() => setInstallmentTarget(null)}
        />
      )}
    </div>
  );
}
