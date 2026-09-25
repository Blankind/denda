import { useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import { StockOpnameRecord } from '../types';

interface InstallmentModalProps {
  record: StockOpnameRecord;
  onSave: (data: StockOpnameRecord) => void;
  onClose: () => void;
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

export function InstallmentModal({ record, onSave, onClose }: InstallmentModalProps) {
  const [installments, setInstallments] = useState(record.installments || []);
  const [isPaidOff, setIsPaidOff] = useState(record.isPaidOff || false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Dasar hitung: nilai klaim kalau sudah ditentukan, kalau belum pakai nilai sistem
  const baseValue = record.claimValue ?? record.systemValue;
  const totalPaid = installments.reduce((s, i) => s + i.amount, 0);
  const sisa = baseValue - totalPaid;

  const addInstallment = () => {
    const num = Number(amount);
    if (!num || num <= 0) return;
    setInstallments([...installments, { id: crypto.randomUUID(), date, amount: num, note }]);
    setAmount('');
    setNote('');
  };

  const removeInstallment = (id: string) => {
    setInstallments(installments.filter(i => i.id !== id));
  };

  const handleSave = () => {
    onSave({ ...record, installments, isPaidOff });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">{record.itemName}</h2>
            <p className="text-xs text-zinc-500">{record.name} · {record.branch}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Ringkasan nilai */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-zinc-50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Nilai Sistem</p>
              <p className="font-semibold text-zinc-900">{formatRupiah(record.systemValue)}</p>
            </div>
            <div className="bg-zinc-50 rounded-lg p-3">
              <p className="text-xs text-zinc-500">Nilai Diklaim</p>
              <p className="font-semibold text-zinc-900">
                {record.claimValue !== undefined ? formatRupiah(record.claimValue) : 'Belum ditentukan'}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-emerald-700">Sudah Dibayar</p>
              <p className="font-semibold text-emerald-700">{formatRupiah(totalPaid)}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700">Sisa</p>
              <p className="font-semibold text-amber-700">{formatRupiah(Math.max(sisa, 0))}</p>
            </div>
          </div>

          {record.claimValue === undefined && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              Nilai klaim belum ditentukan atasan. Sisa dihitung sementara dari nilai sistem.
            </p>
          )}

          {/* Riwayat angsuran */}
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Riwayat Angsuran</p>
            {installments.length === 0 && (
              <p className="text-sm text-zinc-400 text-center py-3">Belum ada angsuran.</p>
            )}
            <div className="space-y-2">
              {installments.map(inst => (
                <div key={inst.id} className="flex items-center justify-between bg-zinc-50 rounded-lg px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900">{formatRupiah(inst.amount)}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(inst.date).toLocaleDateString('id-ID')}{inst.note ? ` · ${inst.note}` : ''}
                    </p>
                  </div>
                  <button onClick={() => removeInstallment(inst.id)} className="p-1.5 text-zinc-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tambah angsuran baru */}
          <div className="border border-zinc-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tambah Angsuran</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Jumlah"
                className="px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Catatan (opsional)"
                className="flex-1 px-2 py-1.5 text-sm border border-zinc-300 rounded-lg"
              />
              <button
                onClick={addInstallment}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>
          </div>

          {/* Centang lunas manual */}
          <label className="flex items-center gap-2 text-sm bg-zinc-50 rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaidOff}
              onChange={e => setIsPaidOff(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 accent-emerald-600"
            />
            <span className="font-medium text-zinc-800">Tandai Lunas</span>
            <span className="text-xs text-zinc-400">(bisa dicentang manual meski sisa belum 0, sesuai keputusan atasan)</span>
          </label>
        </div>

        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg">
            Batal
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
