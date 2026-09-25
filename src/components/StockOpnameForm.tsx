import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { StockOpnameRecord } from '../types';

interface StockOpnameFormProps {
  initial: StockOpnameRecord | null;
  onSave: (data: StockOpnameRecord) => void;
  onClose: () => void;
}

export function StockOpnameForm({ initial, onSave, onClose }: StockOpnameFormProps) {
  const [itemName, setItemName] = useState(initial?.itemName || '');
  const [branch, setBranch] = useState(initial?.branch || '');
  const [name, setName] = useState(initial?.name || '');
  const [qtySelisih, setQtySelisih] = useState(initial?.qtySelisih?.toString() || '');
  const [systemValue, setSystemValue] = useState(initial?.systemValue?.toString() || '');
  const [claimValue, setClaimValue] = useState(initial?.claimValue?.toString() || '');
  const [description, setDescription] = useState(initial?.description || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!itemName || !branch || !name || !systemValue) return;

    onSave({
      id: initial?.id || crypto.randomUUID(),
      createdAt: initial?.createdAt || new Date().toISOString(),
      itemName,
      branch,
      name,
      qtySelisih: qtySelisih ? Number(qtySelisih) : undefined,
      systemValue: Number(systemValue),
      claimValue: claimValue ? Number(claimValue) : undefined,
      installments: initial?.installments || [],
      isPaidOff: initial?.isPaidOff || false,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200">
          <h2 className="text-lg font-bold text-zinc-900">
            {initial ? 'Edit' : 'Tambah'} Selisih Stock
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 space-y-3 flex-1">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Nama Item</label>
              <input
                required
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                placeholder="Contoh: Sabun Cuci 800ml"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Cabang</label>
                <input
                  required
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Penanggung Jawab</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Qty Selisih</label>
                <input
                  type="number"
                  value={qtySelisih}
                  onChange={e => setQtySelisih(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                  placeholder="opsional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Nilai Selisih (Sistem)</label>
                <input
                  required
                  type="number"
                  value={systemValue}
                  onChange={e => setSystemValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Nilai Diklaim (kebijakan atasan)
              </label>
              <input
                type="number"
                value={claimValue}
                onChange={e => setClaimValue(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
                placeholder="Kosongkan jika belum ada keputusan"
              />
              <p className="text-xs text-zinc-400 mt-1">
                Nilai ini yang jadi dasar angsuran, boleh beda dari nilai sistem.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Catatan</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-zinc-200 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
            >
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
