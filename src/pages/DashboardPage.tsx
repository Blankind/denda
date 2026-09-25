import { useEffect, useMemo, useState } from 'react';
import { Building2, ShieldAlert, Package } from 'lucide-react';
import { PenaltyRecord, StockOpnameRecord } from '../types';

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

interface DashboardPageProps {
  onNavigate?: (page: 'denda' | 'stock', branch: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps = {}) {
  const [dendaRecords, setDendaRecords] = useState<PenaltyRecord[]>([]);
  const [stockRecords, setStockRecords] = useState<StockOpnameRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(d => {
        setIsConfigured(!!d.configured);
        if (!d.configured) return;
        return Promise.all([
          fetch('/api/records').then(r => r.json()).catch(() => []),
          fetch('/api/stock').then(r => r.json()).catch(() => []),
        ]).then(([denda, stock]) => {
          setDendaRecords(Array.isArray(denda) ? denda : []);
          setStockRecords(Array.isArray(stock) ? stock : []);
        });
      })
      .catch(() => setIsConfigured(false))
      .finally(() => setIsLoading(false));
  }, []);

  const branches = useMemo(() => {
    const set = new Set<string>();
    dendaRecords.forEach(r => r.branch && set.add(r.branch));
    stockRecords.forEach(r => r.branch && set.add(r.branch));
    return [...set].sort();
  }, [dendaRecords, stockRecords]);

  const perBranch = useMemo(() => {
    return branches.map(branch => {
      const denda = dendaRecords.filter(r => r.branch === branch);
      const dendaTotal = denda.reduce((s, r) => s + r.amount, 0);
      const dendaPaid = denda.filter(r => r.status === 'PAID').reduce((s, r) => s + r.amount, 0);
      const dendaUnpaid = dendaTotal - dendaPaid;

      const stock = stockRecords.filter(r => r.branch === branch && !r.isNotRecognized);
      const stockClaim = stock.reduce((s, r) => s + (r.claimValue ?? r.systemValue), 0);
      const stockPaid = stock.reduce((s, r) => s + r.installments.reduce((a, i) => a + i.amount, 0), 0);
      const stockOpen = stock.filter(r => !r.isPaidOff).length;
      const stockSisa = Math.max(stockClaim - stockPaid, 0);

      return {
        branch,
        dendaCount: denda.length, dendaTotal, dendaPaid, dendaUnpaid,
        stockCount: stock.length, stockClaim, stockPaid, stockSisa, stockOpen,
        combinedOutstanding: dendaUnpaid + stockSisa,
      };
    });
  }, [branches, dendaRecords, stockRecords]);

  const grand = perBranch.reduce((acc, b) => ({
    dendaTotal: acc.dendaTotal + b.dendaTotal,
    dendaUnpaid: acc.dendaUnpaid + b.dendaUnpaid,
    stockClaim: acc.stockClaim + b.stockClaim,
    stockSisa: acc.stockSisa + b.stockSisa,
    combinedOutstanding: acc.combinedOutstanding + b.combinedOutstanding,
  }), { dendaTotal: 0, dendaUnpaid: 0, stockClaim: 0, stockSisa: 0, combinedOutstanding: 0 });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-zinc-400 text-sm">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {!isConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-4 py-2 text-center">
          Belum terhubung ke Spreadsheet.
        </div>
      )}

      <header className="bg-white border-b border-zinc-200 px-4 py-4 sm:px-6 sticky top-11 z-30">
        <div className="max-w-5xl mx-auto flex items-center gap-2">
          <Building2 className="w-5 h-5 text-zinc-900" />
          <h1 className="text-lg font-bold text-zinc-900">Dashboard per Cabang</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Ringkasan total semua cabang */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">Total Denda Operasional</p>
            <p className="text-lg font-bold text-zinc-900">{formatRupiah(grand.dendaTotal)}</p>
          </div>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs text-zinc-500">Total Klaim Selisih Stock</p>
            <p className="text-lg font-bold text-zinc-900">{formatRupiah(grand.stockClaim)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-rose-600">Total Belum Lunas (Gabungan)</p>
            <p className="text-lg font-bold text-rose-600">{formatRupiah(grand.combinedOutstanding)}</p>
          </div>
        </div>

        {branches.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-10">Belum ada data cabang.</p>
        )}

        {/* Card per cabang */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {perBranch.map(b => (
            <div key={b.branch} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold text-zinc-900">{b.branch}</h3>
                {b.combinedOutstanding > 0 && (
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    Belum lunas {formatRupiah(b.combinedOutstanding)}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div
                  onClick={() => onNavigate?.('denda', b.branch)}
                  className={onNavigate ? 'cursor-pointer rounded-lg -m-2 p-2 hover:bg-zinc-50 transition-colors' : ''}
                  title={onNavigate ? `Lihat Denda Operasional cabang ${b.branch}` : undefined}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Denda Operasional
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-zinc-400">Jumlah</p>
                      <p className="font-medium text-zinc-800">{b.dendaCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Lunas</p>
                      <p className="font-medium text-emerald-600">{formatRupiah(b.dendaPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Belum Lunas</p>
                      <p className="font-medium text-amber-600">{formatRupiah(b.dendaUnpaid)}</p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => onNavigate?.('stock', b.branch)}
                  className={`pt-2 border-t border-zinc-100 ${onNavigate ? 'cursor-pointer rounded-lg -mx-2 px-2 pb-1 hover:bg-zinc-50 transition-colors' : ''}`}
                  title={onNavigate ? `Lihat Selisih Stock cabang ${b.branch}` : undefined}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
                    <Package className="w-3.5 h-3.5" /> Selisih Stock
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-zinc-400">Klaim Terbuka</p>
                      <p className="font-medium text-zinc-800">{b.stockOpen}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Dibayar</p>
                      <p className="font-medium text-emerald-600">{formatRupiah(b.stockPaid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Sisa</p>
                      <p className="font-medium text-amber-600">{formatRupiah(b.stockSisa)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
