import { X, History as HistoryIcon } from 'lucide-react';
import { StockOpnameRecord } from '../types';

interface HistoryModalProps {
  record: StockOpnameRecord;
  onClose: () => void;
}

export function HistoryModal({ record, onClose }: HistoryModalProps) {
  const lines = (record.historyRaw || '').split('\n').filter(l => l.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between p-4 border-b border-zinc-200">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-600 shrink-0">
              <HistoryIcon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-zinc-900 truncate">{record.itemName}</h2>
              <p className="text-xs text-zinc-500 truncate">{record.name} · {record.branch} · {record.period}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-10">
              Tidak ada data history dari file excel untuk item ini.
            </p>
          ) : (
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="text-xs font-mono text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
