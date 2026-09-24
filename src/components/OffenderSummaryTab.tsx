import React, { useState, useMemo } from 'react';
import { PenaltyRecord } from '../types';
import { PaymentModal } from './PaymentModal';
import { 
  Users, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Calendar, 
  ArrowUpDown,
  Download,
  Wallet
} from 'lucide-react';

interface OffenderSummary {
  normalizedKey: string;
  displayName: string;
  totalAmount: number;
  totalCases: number;
  unpaidCount: number;
  unpaidAmount: number;
  paidCount: number;
  paidAmount: number;
  branches: string[];
  records: PenaltyRecord[];
}

interface OffenderSummaryTabProps {
  records: PenaltyRecord[];
  onBulkPay?: (ids: string[], paymentDate?: string, destinationAccount?: 'TACIK' | 'KOORDINATOR') => void;
  onEditRecord?: (record: PenaltyRecord) => void;
}

export function OffenderSummaryTab({ records, onBulkPay, onEditRecord }: OffenderSummaryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOffenders, setExpandedOffenders] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [sortBy, setSortBy] = useState<'amount' | 'cases' | 'name'>('amount');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');

  // Payment Modal State
  const [paymentModalState, setPaymentModalState] = useState<{
    isOpen: boolean;
    ids: string[];
    count: number;
    totalAmount: number;
    targetName: string;
  }>({
    isOpen: false,
    ids: [],
    count: 0,
    totalAmount: 0,
    targetName: '',
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Group records by case-insensitive trimmed name
  const summaries = useMemo(() => {
    const map = new Map<string, OffenderSummary>();

    for (const record of records) {
      const rawName = (record.name || 'Tanpa Nama').trim();
      const normalizedKey = rawName.toLowerCase();

      if (!map.has(normalizedKey)) {
        map.set(normalizedKey, {
          normalizedKey,
          displayName: rawName, // Keep original casing or capitalized presentation
          totalAmount: 0,
          totalCases: 0,
          unpaidCount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          paidAmount: 0,
          branches: [],
          records: [],
        });
      }

      const entry = map.get(normalizedKey)!;
      entry.totalAmount += record.amount;
      entry.totalCases += 1;
      entry.records.push(record);

      if (record.branch && !entry.branches.includes(record.branch)) {
        entry.branches.push(record.branch);
      }

      if (record.status === 'PAID') {
        entry.paidCount += 1;
        entry.paidAmount += record.amount;
      } else {
        entry.unpaidCount += 1;
        entry.unpaidAmount += record.amount;
      }
    }

    return Array.from(map.values());
  }, [records]);

  // Filter & Search
  const filteredSummaries = useMemo(() => {
    let result = summaries;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.normalizedKey.includes(q) ||
          s.branches.some((b) => b.toLowerCase().includes(q))
      );
    }

    if (statusFilter === 'UNPAID') {
      result = result.filter((s) => s.unpaidCount > 0);
    } else if (statusFilter === 'PAID') {
      result = result.filter((s) => s.unpaidCount === 0);
    }

    // Sort
    result.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'amount') {
        diff = a.totalAmount - b.totalAmount;
      } else if (sortBy === 'cases') {
        diff = a.totalCases - b.totalCases;
      } else if (sortBy === 'name') {
        diff = a.displayName.localeCompare(b.displayName);
      }

      return sortDirection === 'desc' ? -diff : diff;
    });

    return result;
  }, [summaries, searchTerm, statusFilter, sortBy, sortDirection]);

  const toggleExpand = (normalizedKey: string) => {
    setExpandedOffenders((prev) =>
      prev.includes(normalizedKey)
        ? prev.filter((k) => k !== normalizedKey)
        : [...prev, normalizedKey]
    );
  };

  const toggleExpandAll = () => {
    if (expandedOffenders.length === filteredSummaries.length) {
      setExpandedOffenders([]);
    } else {
      setExpandedOffenders(filteredSummaries.map((s) => s.normalizedKey));
    }
  };

  const handlePayAllForOffender = (summary: OffenderSummary) => {
    if (!onBulkPay) return;
    const unpaidRecords = summary.records.filter((r) => r.status !== 'PAID');
    if (unpaidRecords.length === 0) return;

    setPaymentModalState({
      isOpen: true,
      ids: unpaidRecords.map((r) => r.id),
      count: unpaidRecords.length,
      totalAmount: summary.unpaidAmount,
      targetName: summary.displayName,
    });
  };

  const handlePaySingleRecord = (record: PenaltyRecord) => {
    if (!onBulkPay) return;
    setPaymentModalState({
      isOpen: true,
      ids: [record.id],
      count: 1,
      totalAmount: record.amount,
      targetName: record.name,
    });
  };

  const handleConfirmPayment = (paymentDate: string, destinationAccount: 'TACIK' | 'KOORDINATOR') => {
    if (!onBulkPay || paymentModalState.ids.length === 0) return;
    onBulkPay(paymentModalState.ids, paymentDate, destinationAccount);
  };

  // Grand totals across all unique offenders
  const grandTotalAmount = summaries.reduce((sum, s) => sum + s.totalAmount, 0);
  const grandUnpaidAmount = summaries.reduce((sum, s) => sum + s.unpaidAmount, 0);
  const grandPaidAmount = summaries.reduce((sum, s) => sum + s.paidAmount, 0);

  // CSV Export for Summary
  const exportSummaryCsv = () => {
    const headers = ['Nama Pelanggar', 'Gudang/Cabang', 'Total Kasus', 'Total Denda (Rp)', 'Belum Lunas (Rp)', 'Lunas (Rp)'];
    const rows = filteredSummaries.map((s) => [
      `"${s.displayName.replace(/"/g, '""')}"`,
      `"${s.branches.join(', ')}"`,
      s.totalCases,
      s.totalAmount,
      s.unpaidAmount,
      s.paidAmount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_kumulatif_pelanggar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col">
      {/* Top Banner / Summary KPI */}
      <div className="p-5 sm:p-6 border-b border-zinc-100 bg-zinc-50/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-zinc-900 text-white rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
                  Rekap Kumulatif per Pelanggar
                </h2>
                <p className="text-xs text-zinc-500">
                  Data otomatis digabung kumulatif tanpa membedakan huruf besar/kecil (<i>case-insensitive</i>)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-3.5 py-2 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[11px] text-zinc-400 block font-medium">Total Pelanggar Unik</span>
              <span className="text-base font-bold text-zinc-900">{summaries.length} Orang/Pihak</span>
            </div>
            {/* Kolom Lunas */}
            <div className="bg-emerald-50/70 px-3.5 py-2 rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[11px] text-emerald-800 block font-semibold">Total Lunas</span>
              <span className="text-base font-bold text-emerald-700">{formatRupiah(grandPaidAmount)}</span>
            </div>
            {/* Kolom Belum Lunas (Kontrol) */}
            <div className="bg-amber-50/70 px-3.5 py-2 rounded-xl border border-amber-200 shadow-2xs">
              <span className="text-[11px] text-amber-900 block font-semibold">Belum Lunas (Kontrol)</span>
              <span className="text-base font-bold text-rose-600">{formatRupiah(grandUnpaidAmount)}</span>
            </div>
            <div className="bg-white px-3.5 py-2 rounded-xl border border-zinc-200 shadow-2xs">
              <span className="text-[11px] text-zinc-400 block font-medium">Total Akumulasi Denda</span>
              <span className="text-base font-bold text-zinc-900">{formatRupiah(grandTotalAmount)}</span>
            </div>

            <button
              onClick={exportSummaryCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              title="Unduh Rekap CSV"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 pt-4 border-t border-zinc-200/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama pelanggar, toko, gudang..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 w-full shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center bg-zinc-100/80 p-1 rounded-xl border border-zinc-200/50 text-xs">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'ALL' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Semua ({summaries.length})
              </button>
              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'UNPAID' ? 'bg-amber-100 text-amber-900 font-semibold shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Ada Tunggakan
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  statusFilter === 'PAID' ? 'bg-emerald-100 text-emerald-900 font-semibold shadow-2xs' : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Semua Lunas
              </button>
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-2 py-1 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-zinc-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="amount">Nominal Terbesar</option>
                <option value="cases">Jumlah Kasus Terbanyak</option>
                <option value="name">Nama (A-Z)</option>
              </select>
              <button
                onClick={() => setSortDirection((d) => (d === 'desc' ? 'asc' : 'desc'))}
                className="px-1 text-zinc-500 hover:text-zinc-800 font-bold"
                title="Balik Urutan"
              >
                {sortDirection === 'desc' ? '↓' : '↑'}
              </button>
            </div>

            {/* Expand / Collapse All */}
            <button
              onClick={toggleExpandAll}
              className="text-xs text-zinc-600 hover:text-zinc-900 px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors font-medium whitespace-nowrap"
            >
              {expandedOffenders.length === filteredSummaries.length ? 'Tutup Semua Rincian' : 'Buka Semua Rincian'}
            </button>
          </div>
        </div>
      </div>

      {/* List / Table of Summaries */}
      <div className="overflow-x-auto">
        {filteredSummaries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-zinc-500">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-100">
              <AlertCircle className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="font-semibold text-zinc-900 mb-1">Tidak ada data rekap ditemukan</p>
            <p className="text-xs">Data denda belum ada atau filter pencarian tidak sesuai.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filteredSummaries.map((summary, idx) => {
              const isExpanded = expandedOffenders.includes(summary.normalizedKey);
              const isFullyPaid = summary.unpaidCount === 0;

              return (
                <div 
                  key={summary.normalizedKey}
                  className={`transition-colors ${isExpanded ? 'bg-zinc-50/60' : 'hover:bg-zinc-50/40'}`}
                >
                  {/* Summary Row Card */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Name, Branch, Count */}
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-zinc-900 text-sm sm:text-base tracking-tight truncate">
                            {summary.displayName}
                          </h3>

                          {/* Branch badge */}
                          {summary.branches.map((b) => (
                            <span 
                              key={b} 
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600"
                            >
                              <Building2 className="w-3 h-3 text-zinc-400" />
                              {b}
                            </span>
                          ))}

                          {/* Status Badge */}
                          {isFullyPaid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Lunas Semua
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                              <AlertCircle className="w-3 h-3" />
                              {summary.unpaidCount} Belum Lunas
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500 mt-1">
                          Total akumulasi <b>{summary.totalCases} kasus pelanggaran</b>
                        </p>
                      </div>
                    </div>

                    {/* Middle: Money Figures (Lunas & Belum Lunas Kolom Kontrol) */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-between lg:justify-end">
                      {/* Kolom Lunas */}
                      <div className="text-right">
                        <span className="text-[11px] text-emerald-700 block font-semibold">Lunas</span>
                        <span className="text-sm sm:text-base font-bold text-emerald-700">
                          {formatRupiah(summary.paidAmount)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-normal">
                          {summary.paidCount} lunas
                        </span>
                      </div>

                      {/* Kolom Belum Lunas */}
                      <div className="text-right">
                        <span className="text-[11px] text-amber-800 block font-semibold">Belum Lunas (Kontrol)</span>
                        <span className={`text-sm sm:text-base font-bold ${summary.unpaidAmount > 0 ? 'text-rose-600' : 'text-zinc-400'}`}>
                          {formatRupiah(summary.unpaidAmount)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-normal">
                          {summary.unpaidCount} belum bayar
                        </span>
                      </div>

                      {/* Total */}
                      <div className="text-right pl-2 border-l border-zinc-200">
                        <span className="text-[11px] text-zinc-400 block font-medium">Total Akumulasi</span>
                        <span className="text-sm sm:text-base font-bold text-zinc-900">
                          {formatRupiah(summary.totalAmount)}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-normal">
                          {summary.totalCases} kasus
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {summary.unpaidCount > 0 && onBulkPay && (
                          <button
                            onClick={() => handlePayAllForOffender(summary)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap"
                            title="Lunasi semua tunggakan orang ini"
                          >
                            Lunasi Semua ({summary.unpaidCount})
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpand(summary.normalizedKey)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Breakdown of Individual Records */}
                  {isExpanded && (
                    <div className="px-4 pb-5 sm:px-6 pt-1">
                      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
                        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs font-semibold text-zinc-600">
                          <span>Rincian Setiap Pelanggaran ({summary.records.length} Catatan)</span>
                          <span className="text-zinc-400 font-normal">Nama dalam catatan bisa bervariasi huruf besar/kecil</span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs text-zinc-600">
                            <thead className="bg-zinc-50/50 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-100">
                              <tr>
                                <th className="px-3.5 py-2.5">Tanggal</th>
                                <th className="px-3.5 py-2.5">Penulisan Nama</th>
                                <th className="px-3.5 py-2.5">Gudang</th>
                                <th className="px-3.5 py-2.5">Nominal</th>
                                <th className="px-3.5 py-2.5">Status & Info Bayar</th>
                                <th className="px-3.5 py-2.5">Alasan / Keterangan</th>
                                <th className="px-3.5 py-2.5">Detail Barang</th>
                                <th className="px-3.5 py-2.5 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {summary.records.map((rec) => (
                                <tr key={rec.id} className="hover:bg-zinc-50/60 transition-colors">
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1 text-zinc-600 font-medium">
                                      <Calendar className="w-3 h-3 text-zinc-400" />
                                      {formatDate(rec.createdAt)}
                                    </div>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-medium text-zinc-800">
                                    {rec.name}
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    <span className="bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded text-[11px]">
                                      {rec.branch}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-bold text-zinc-900 whitespace-nowrap">
                                    {formatRupiah(rec.amount)}
                                  </td>
                                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                                    {rec.status === 'PAID' ? (
                                      <div className="space-y-0.5">
                                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200 inline-block">
                                          Lunas
                                        </span>
                                        {(rec.paidAt || rec.destinationAccount) && (
                                          <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <Wallet className="w-2.5 h-2.5 text-emerald-600" />
                                            <span>
                                              {rec.destinationAccount ? `Uang: ${rec.destinationAccount}` : ''}
                                              {rec.paidAt ? ` (${formatDate(rec.paidAt)})` : ''}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200 inline-block">
                                        Belum Lunas
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 max-w-xs truncate" title={rec.description}>
                                    {rec.description || '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 max-w-xs truncate text-zinc-500" title={rec.documentDetail}>
                                    {rec.documentDetail || '-'}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1">
                                      {rec.status !== 'PAID' && onBulkPay && (
                                        <button
                                          onClick={() => handlePaySingleRecord(rec)}
                                          className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded transition-colors"
                                          title="Lunasi denda ini"
                                        >
                                          Lunasi
                                        </button>
                                      )}
                                      {onEditRecord && (
                                        <button
                                          onClick={() => onEditRecord(rec)}
                                          className="text-[11px] text-zinc-700 hover:text-zinc-900 font-medium bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded transition-colors"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Confirmation Modal with Date & Destination Account (TACIK / KOORDINATOR) */}
      <PaymentModal
        isOpen={paymentModalState.isOpen}
        onClose={() => setPaymentModalState((prev) => ({ ...prev, isOpen: false }))}
        count={paymentModalState.count}
        totalAmount={paymentModalState.totalAmount}
        targetName={paymentModalState.targetName}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
