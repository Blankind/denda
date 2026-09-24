import React, { useState } from 'react';
import { PenaltyRecord } from '../types';
import { PaymentModal } from './PaymentModal';
import { 
  Search, 
  MapPin, 
  Calendar, 
  FileText, 
  Trash2, 
  Pencil, 
  AlertCircle, 
  CheckCircle, 
  Check, 
  AlertTriangle, 
  X,
  Wallet
} from 'lucide-react';

interface RecordListProps {
  records: PenaltyRecord[];
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onEdit: (record: PenaltyRecord) => void;
  onBulkPay: (ids: string[], paymentDate?: string, destinationAccount?: 'TACIK' | 'KOORDINATOR') => void;
}

export function RecordList({ records, onDelete, onBulkDelete, onEdit, onBulkPay }: RecordListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recordToDelete, setRecordToDelete] = useState<PenaltyRecord | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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

  const totalPaidCount = records.filter(r => r.status === 'PAID').length;
  const totalUnpaidCount = records.filter(r => r.status !== 'PAID').length;

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.branch.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.description && record.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (record.documentDetail && record.documentDetail.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'UNPAID') return record.status !== 'PAID';
    if (statusFilter === 'PAID') return record.status === 'PAID';
    return true;
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

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const handleBulkPayClick = () => {
    const unpaidSelectedRecords = records.filter(
      r => selectedIds.includes(r.id) && r.status !== 'PAID'
    );

    if (unpaidSelectedRecords.length === 0) {
      alert('Semua denda yang dipilih sudah lunas.');
      return;
    }

    const totalUnpaid = unpaidSelectedRecords.reduce((sum, r) => sum + r.amount, 0);

    setPaymentModalState({
      isOpen: true,
      ids: unpaidSelectedRecords.map(r => r.id),
      count: unpaidSelectedRecords.length,
      totalAmount: totalUnpaid,
      targetName: `${unpaidSelectedRecords.length} Denda Terpilih`,
    });
  };

  const handlePaySingleClick = (record: PenaltyRecord) => {
    setPaymentModalState({
      isOpen: true,
      ids: [record.id],
      count: 1,
      totalAmount: record.amount,
      targetName: record.name,
    });
  };

  const handleConfirmPayment = (paymentDate: string, destinationAccount: 'TACIK' | 'KOORDINATOR') => {
    onBulkPay(paymentModalState.ids, paymentDate, destinationAccount);
    setSelectedIds([]);
  };

  const handleConfirmSingleDelete = () => {
    if (recordToDelete) {
      onDelete(recordToDelete.id);
      setSelectedIds(prev => prev.filter(id => id !== recordToDelete.id));
      setRecordToDelete(null);
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length > 0 && onBulkDelete) {
      onBulkDelete(selectedIds);
      setSelectedIds([]);
      setIsBulkDeleting(false);
    }
  };

  const totalSelectedAmount = records
    .filter(r => selectedIds.includes(r.id))
    .reduce((sum, r) => sum + r.amount, 0);

  const unpaidSelectedCount = records
    .filter(r => selectedIds.includes(r.id) && r.status !== 'PAID').length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col h-full relative">
      {/* Header & Search with Status Control */}
      <div className="p-5 sm:p-6 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-50/30">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Daftar Catatan Denda</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Kelola, lunasi, atau kontrol data denda/klaim</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Status Filter Control */}
          <div className="flex items-center bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/60 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Semua ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'UNPAID'
                  ? 'bg-amber-100 text-amber-950 shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-amber-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Belum Lunas ({totalUnpaidCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PAID')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                statusFilter === 'PAID'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'text-zinc-500 hover:text-emerald-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Lunas ({totalPaidCount})</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, cabang, keterangan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 w-full sm:w-64 transition-all shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-zinc-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1 rounded-lg text-xs font-semibold">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{selectedIds.length} Denda Terpilih</span>
            </div>
            <span className="text-xs text-zinc-300 hidden sm:inline">
              Total: <b className="text-white font-semibold">{formatRupiah(totalSelectedAmount)}</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {unpaidSelectedCount > 0 && (
              <button
                onClick={handleBulkPayClick}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Lunasi Terpilih ({unpaidSelectedCount})</span>
              </button>
            )}

            {onBulkDelete && (
              <button
                onClick={() => setIsBulkDeleting(true)}
                className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            )}

            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-zinc-400 hover:text-white px-2 py-1 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="overflow-x-auto">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-zinc-500">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4 border border-zinc-100">
              <AlertCircle className="w-8 h-8 text-zinc-300" />
            </div>
            <p className="font-medium text-zinc-900 mb-1">Tidak ada catatan ditemukan</p>
            <p className="text-sm">Belum ada data denda atau pencarian tidak cocok.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="text-xs text-zinc-500 font-medium uppercase tracking-wider bg-zinc-50/70 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                    checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                    onChange={toggleSelectAll}
                    title="Pilih Semua"
                  />
                </th>
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Pegawai / Pelanggan</th>
                <th className="px-4 py-3.5">Gudang</th>
                <th className="px-4 py-3.5">Nominal</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Keterangan</th>
                <th className="px-4 py-3.5 text-center min-w-[140px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRecords.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                return (
                  <tr 
                    key={record.id} 
                    className={`transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-zinc-50/80'}`}
                  >
                    <td className="px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                        checked={isSelected}
                        onChange={() => toggleSelect(record.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {formatDate(record.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-zinc-900 text-sm">{record.name}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        {record.branch}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-zinc-900">
                        {formatRupiah(record.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {record.status === 'PAID' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Lunas
                          </span>
                          {(record.paidAt || record.destinationAccount) && (
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                              <Wallet className="w-3 h-3 text-emerald-600" />
                              <span>
                                {record.destinationAccount ? `Uang: ${record.destinationAccount}` : ''}
                                {record.paidAt ? ` (${formatDate(record.paidAt)})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          Belum Lunas
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="line-clamp-2 max-w-xs text-xs text-zinc-700" title={record.description}>
                        {record.description}
                      </p>
                      {record.documentDetail && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-zinc-400">
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[180px] inline-block" title={record.documentDetail}>
                            {record.documentDetail}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {/* Explicit, always-visible Action Buttons */}
                      <div className="inline-flex items-center gap-1.5">
                        {record.status !== 'PAID' && (
                          <button
                            type="button"
                            onClick={() => handlePaySingleClick(record)}
                            className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                            title="Lunasi Denda Ini"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Lunasi</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onEdit(record)}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          title="Edit Catatan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRecordToDelete(record)}
                          className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          title="Hapus Catatan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation Modal: Single Record Delete */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-zinc-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-900">Hapus Catatan Denda?</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Data denda ini akan dihapus secara permanen dari sistem dan Google Sheets.
                </p>

                <div className="mt-3.5 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs space-y-1">
                  <p><b className="text-zinc-700">Nama:</b> {recordToDelete.name}</p>
                  <p><b className="text-zinc-700">Cabang:</b> {recordToDelete.branch}</p>
                  <p><b className="text-zinc-700">Nominal:</b> {formatRupiah(recordToDelete.amount)}</p>
                  <p><b className="text-zinc-700">Alasan:</b> {recordToDelete.description}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-5 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Bulk Delete */}
      {isBulkDeleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-zinc-200 animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-zinc-900">
                  Hapus {selectedIds.length} Denda Terpilih?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Tindakan ini akan menghapus <b>{selectedIds.length} baris data</b> sekaligus dari aplikasi dan Google Sheets secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsBulkDeleting(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.length} Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
