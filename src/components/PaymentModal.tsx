import React, { useState } from 'react';
import { CheckCircle, X, Calendar, Wallet } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  totalAmount: number;
  targetName?: string;
  onConfirm: (paymentDate: string, destinationAccount: 'TACIK' | 'KOORDINATOR') => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  count,
  totalAmount,
  targetName,
  onConfirm,
}: PaymentModalProps) {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [destinationAccount, setDestinationAccount] = useState<'TACIK' | 'KOORDINATOR'>('TACIK');

  if (!isOpen) return null;

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(paymentDate, destinationAccount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Konfirmasi Pelunasan Denda</h3>
              <p className="text-xs text-zinc-500">
                {targetName ? `Pelanggar: ${targetName}` : `${count} item denda terpilih`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-800 font-medium block">Total yang Dilunasi</span>
              <span className="text-xs text-emerald-600 font-medium">{count} Catatan Denda</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-emerald-700 block">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Tanggal Pelunasan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Tanggal Pelunasan</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all font-medium text-zinc-800"
            />
          </div>

          {/* Masuk Mana Uangnya (Opsi: TACIK / KOORDINATOR) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-400" />
              <span>Tujuan Uang Pembayaran Masuk Ke:</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestinationAccount('TACIK')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  destinationAccount === 'TACIK'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <span className="text-sm font-bold">TACIK</span>
                <span className="text-[11px] text-zinc-500 mt-0.5 font-normal">Diserahkan ke Tacik</span>
              </button>

              <button
                type="button"
                onClick={() => setDestinationAccount('KOORDINATOR')}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  destinationAccount === 'KOORDINATOR'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                <span className="text-sm font-bold">KOORDINATOR</span>
                <span className="text-[11px] text-zinc-500 mt-0.5 font-normal">Diterima Koordinator</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
            >
              Simpan & Lunasi ({destinationAccount})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
