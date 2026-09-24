import React, { useState, useEffect, useRef } from 'react';
import { PenaltyRecord } from '../types';
import { 
  PlusCircle, 
  Receipt, 
  Save, 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  RotateCw, 
  Layers, 
  FileSpreadsheet, 
  Camera, 
  Info, 
  ChevronDown, 
  ChevronUp,
  ClipboardCopy
} from 'lucide-react';

interface RecordFormProps {
  onAdd: (record: Omit<PenaltyRecord, 'id'>) => void;
  onAddBatch?: (records: Omit<PenaltyRecord, 'id'>[]) => void;
  onUpdate: (record: PenaltyRecord) => void;
  onDelete?: (id: string) => void;
  editingRecord: PenaltyRecord | null;
  onCancelEdit: () => void;
}

export function RecordForm({ onAdd, onAddBatch, onUpdate, onDelete, editingRecord, onCancelEdit }: RecordFormProps) {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(getTodayString());
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('KREMBUNG');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [documentDetail, setDocumentDetail] = useState('');
  const [status, setStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [paidAt, setPaidAt] = useState('');
  const [destinationAccount, setDestinationAccount] = useState<'TACIK' | 'KOORDINATOR' | ''>('');

  // AI & Input Mode State
  const [activeTab, setActiveTab] = useState<'screenshot' | 'excelText'>('screenshot');
  const [excelText, setExcelText] = useState('');
  const [showTips, setShowTips] = useState(false);

  // Extraction State
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastImageMime, setLastImageMime] = useState<string>('image/png');
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [extractedRows, setExtractedRows] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingRecord) {
      setName(editingRecord.name);
      setBranch(editingRecord.branch);
      setAmount(editingRecord.amount.toString());
      setDescription(editingRecord.description);
      setDocumentDetail(editingRecord.documentDetail);
      setStatus(editingRecord.status || 'UNPAID');
      setPaidAt(editingRecord.paidAt || '');
      setDestinationAccount((editingRecord.destinationAccount as any) || '');
      if (editingRecord.createdAt) {
        try {
          const d = new Date(editingRecord.createdAt);
          setDate(!isNaN(d.getTime()) ? d.toISOString().split('T')[0] : getTodayString());
        } catch {
          setDate(getTodayString());
        }
      }
    } else {
      resetForm();
    }
  }, [editingRecord]);

  // Support pasting screenshot directly (Ctrl+V) anywhere when modal is open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (editingRecord) return;
      const target = e.target as HTMLElement;
      // If user is actively typing in a standard text input or textarea, let default paste happen
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.id !== 'excelTextarea') {
        return;
      }

      const items = e.clipboardData?.items;
      if (items) {
        // Check if image was pasted
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              setActiveTab('screenshot');
              processImageFile(file);
              return;
            }
          }
        }
      }

      // Check if tabular text from Excel was pasted
      const text = e.clipboardData?.getData('text/plain');
      if (text && (text.includes('\t') || text.includes('GUDANG') || /\d{1,2}\/\d{1,2}\/\d{4}/.test(text))) {
        e.preventDefault();
        setActiveTab('excelText');
        setExcelText(text);
        executeTextExtraction(text);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingRecord]);

  const resetForm = () => {
    setDate(getTodayString());
    setName('');
    setBranch('KREMBUNG');
    setAmount('');
    setDescription('');
    setDocumentDetail('');
    setStatus('UNPAID');
    setPaidAt('');
    setDestinationAccount('');
    setPreviewImage(null);
    setExcelText('');
    setExtractError(null);
    setExtractSuccess(false);
    setExtractedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractionSuccess = (records: any[]) => {
    if (!records || records.length === 0) {
      throw new Error('Data tidak terbaca dari format yang diberikan. Periksa tips panduan format di bawah.');
    }

    setExtractedRows(records);

    // Auto-fill the first record into the form inputs
    const first = records[0];
    if (first.name) setName(first.name);
    if (first.branch) setBranch(first.branch);
    if (first.amount !== undefined && first.amount !== null) {
      setAmount(first.amount.toString());
    }
    if (first.description) setDescription(first.description);
    if (first.documentDetail) setDocumentDetail(first.documentDetail);
    if (first.date && !isNaN(new Date(first.date).getTime())) {
      setDate(first.date);
    }

    setExtractSuccess(true);
  };

  const executeExtraction = async (base64Data: string, mimeType: string) => {
    setExtractError(null);
    setExtractSuccess(false);
    setIsExtracting(true);

    try {
      const res = await fetch('/api/extract-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: mimeType,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengekstrak data dari gambar.');
      }

      handleExtractionSuccess(result.records || []);
    } catch (err: any) {
      console.error(err);
      setExtractError(err.message || 'Terjadi kesalahan saat memproses gambar.');
    } finally {
      setIsExtracting(false);
    }
  };

  const executeTextExtraction = async (textToUse?: string) => {
    const raw = (textToUse !== undefined ? textToUse : excelText).trim();
    if (!raw) {
      setExtractError('Silakan tempel (paste) baris tabel dari Excel terlebih dahulu.');
      return;
    }

    setExtractError(null);
    setExtractSuccess(false);
    setIsExtracting(true);

    try {
      const res = await fetch('/api/extract-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawText: raw,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal mengekstrak data dari teks Excel.');
      }

      handleExtractionSuccess(result.records || []);
    } catch (err: any) {
      console.error(err);
      setExtractError(err.message || 'Terjadi kesalahan saat memproses teks.');
    } finally {
      setIsExtracting(false);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setExtractError('File harus berupa format gambar (PNG, JPG, WebP).');
      return;
    }

    setLastImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      setPreviewImage(base64Data);
      executeExtraction(base64Data, file.type);
    };

    reader.onerror = () => {
      setIsExtracting(false);
      setExtractError('Gagal membaca file gambar.');
    };

    reader.readAsDataURL(file);
  };

  const handleRetry = () => {
    if (activeTab === 'screenshot' && previewImage) {
      executeExtraction(previewImage, lastImageMime);
    } else if (activeTab === 'excelText' && excelText) {
      executeTextExtraction();
    }
  };

  const handleSelectExtractedRow = (row: any) => {
    if (row.name) setName(row.name);
    if (row.branch) setBranch(row.branch);
    if (row.amount !== undefined && row.amount !== null) {
      setAmount(row.amount.toString());
    }
    if (row.description) setDescription(row.description);
    if (row.documentDetail) setDocumentDetail(row.documentDetail);
    if (row.date && !isNaN(new Date(row.date).getTime())) {
      setDate(row.date);
    }
  };

  const handleSaveAllExtracted = () => {
    if (!extractedRows.length) return;

    if (onAddBatch) {
      const batchData = extractedRows.map((r) => ({
        name: r.name || 'Tanpa Nama',
        branch: r.branch || 'GUDANG 1',
        amount: Number(r.amount) || 0,
        description: r.description || '-',
        documentDetail: r.documentDetail || '',
        createdAt: r.date && !isNaN(new Date(r.date).getTime())
          ? new Date(r.date + 'T12:00:00').toISOString()
          : new Date().toISOString(),
        status: 'UNPAID' as const,
      }));
      onAddBatch(batchData);
      resetForm();
    } else {
      handleSubmit({ preventDefault: () => {} } as any);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !branch || !amount || !date) return;

    const createdAt = new Date(date + 'T12:00:00').toISOString();

    if (editingRecord) {
      onUpdate({
        ...editingRecord,
        createdAt,
        name,
        branch,
        amount: Number(amount),
        description,
        documentDetail,
        status,
        paidAt: status === 'PAID' ? (paidAt || getTodayString()) : undefined,
        destinationAccount: status === 'PAID' ? (destinationAccount || 'TACIK') : undefined,
      });
    } else {
      onAdd({
        createdAt,
        name,
        branch,
        amount: Number(amount),
        description,
        documentDetail,
        status,
        paidAt: status === 'PAID' ? (paidAt || getTodayString()) : undefined,
        destinationAccount: status === 'PAID' ? (destinationAccount || 'TACIK') : undefined,
      });
    }
    resetForm();
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border border-zinc-200 p-6 sm:p-8 max-h-[88vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingRecord ? 'bg-zinc-100 text-zinc-900' : 'bg-rose-50 text-rose-600'}`}>
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
              {editingRecord ? 'Edit Catatan Denda' : 'Catat Denda / Klaim'}
            </h2>
            <p className="text-xs text-zinc-500">
              {editingRecord ? 'Perbarui rincian data denda' : 'Bisa auto-ekstrak dari screenshot atau copy-paste Excel'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onCancelEdit();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* AI Auto-Fill Container (Only shown in create mode) */}
      {!editingRecord && (
        <div className="mb-6 space-y-3">
          {/* Method Selector Tabs */}
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('screenshot')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'screenshot'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Screenshot / Foto</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('excelText')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'excelText'
                  ? 'bg-white text-zinc-900 shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Salin dari Excel (Teks)</span>
            </button>
          </div>

          {/* Tab 1: Screenshot Upload / Dropzone */}
          {activeTab === 'screenshot' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer relative overflow-hidden border-2 border-dashed rounded-2xl p-4 sm:p-5 transition-all text-center ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/60 ring-2 ring-indigo-200'
                  : 'border-zinc-200 hover:border-zinc-400 bg-gradient-to-b from-zinc-50 to-white'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {isExtracting ? (
                <div className="py-4 flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                    <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">Sedang Membaca Tabel Screenshot...</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Memindai tanggal, nama PIC, cabang, nominal, dan detail barang</p>
                  </div>
                </div>
              ) : previewImage ? (
                <div className="flex items-center gap-3 text-left">
                  <img
                    src={previewImage}
                    alt="Bukti Screenshot"
                    className="w-16 h-16 object-cover rounded-xl border border-zinc-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Screenshot Dimuat
                    </div>
                    <p className="text-xs text-zinc-600 truncate">Klik untuk ganti gambar atau paste screenshot baru (Ctrl+V)</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(null);
                      setExtractSuccess(false);
                      setExtractedRows([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Hapus Screenshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="py-2.5 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">
                      Upload Screenshot Tabel Excel / Bukti
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Klik untuk upload file, tarik gambar ke sini, atau tekan <kbd className="px-1.5 py-0.5 bg-zinc-200 rounded text-zinc-700 font-mono text-[10px] font-semibold">Ctrl + V</kbd>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Copy-Paste Text from Excel */}
          {activeTab === 'excelText' && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                  <ClipboardCopy className="w-3.5 h-3.5 text-zinc-500" />
                  Tempel (Paste) Baris Excel Langsung di Sini:
                </span>
                <span className="text-[11px] text-zinc-400">Blok baris di Excel &gt; Ctrl+C &gt; Ctrl+V</span>
              </div>
              <textarea
                id="excelTextarea"
                value={excelText}
                onChange={(e) => setExcelText(e.target.value)}
                placeholder="Contoh: Salin baris tabel dari Excel dan tempel di sini..."
                rows={3}
                className="w-full text-xs font-mono p-2.5 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 resize-none text-zinc-800"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => executeTextExtraction()}
                  disabled={isExtracting || !excelText.trim()}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {isExtracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Ekstrak dari Teks Excel</span>
                </button>
              </div>
            </div>
          )}

          {/* Extracted Rows List (Multiple Rows detected) */}
          {extractedRows.length > 1 && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Ditemukan {extractedRows.length} Baris Klaim / Denda:</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllExtracted}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                >
                  Simpan Semua Sekaligus ({extractedRows.length})
                </button>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {extractedRows.map((r, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectExtractedRow(r)}
                    className="p-2 bg-white rounded-xl border border-indigo-100 flex items-center justify-between text-xs hover:border-indigo-400 cursor-pointer transition-all"
                    title="Klik untuk memilih dan mengisi ke form di bawah"
                  >
                    <div className="truncate pr-2">
                      <span className="font-semibold text-zinc-900">{r.name}</span>
                      <span className="text-zinc-400 mx-1.5">•</span>
                      <span className="text-zinc-600">{r.description}</span>
                    </div>
                    <span className="font-semibold text-indigo-700 shrink-0">
                      {formatRupiah(r.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-indigo-700 mt-2">
                *Klik tombol <b>Simpan Semua Sekaligus</b> untuk langsung memasukkan semua denda ke Google Sheets.
              </p>
            </div>
          )}

          {extractSuccess && extractedRows.length === 1 && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Data berhasil terisi otomatis! Silakan periksa atau sesuaikan sebelum disimpan.</span>
            </div>
          )}

          {extractError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{extractError}</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isExtracting}
                className="flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Coba Lagi
              </button>
            </div>
          )}

          {/* Expandable Guide / Format Tips */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>Panduan format agar mudah terbaca oleh AI</span>
              {showTips ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showTips && (
              <div className="mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-600 space-y-2">
                <p className="font-semibold text-zinc-800">Tips Tangkapan Layar (Screenshot):</p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px]">
                  <li><b>Zoom in di Excel:</b> Perbesar tampilan Excel (misal 125% - 150%) sebelum mengambil screenshot agar teks tajam dan tidak kabur/pixelated.</li>
                  <li><b>Sertakan Nama Gudang/Cabang:</b> Seperti tulisan &quot;GUDANG 1&quot; di atas tabel untuk mendeteksi cabang otomatis.</li>
                  <li><b>Kolom yang dibaca:</b> Tanggal, Nama Barang, Toko/Customer, PIC/Nama Penanggung Jawab, Jenis Kesalahan, dan Nominal Denda (Rp).</li>
                </ul>
                <div className="pt-1 border-t border-zinc-200 text-[11px]">
                  <span className="font-semibold text-zinc-800">Alternatif Termudah:</span> Pilih tab <b>&quot;Salin dari Excel (Teks)&quot;</b>, blok baris tabel di Excel, tekan <kbd className="font-mono bg-zinc-200 px-1 rounded">Ctrl+C</kbd>, lalu paste ke kotak teks. Ini 100% cepat dan tidak bergantung pada ketajaman gambar!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Form Fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor="date" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Tanggal Pelanggaran / Klaim
          </label>
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all text-zinc-800"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Nama Pegawai / Toko / Penanggung Jawab
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
            placeholder="Contoh: ELFA / KOOR: RIFA"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="branch" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Gudang / Cabang
            </label>
            <input
              id="branch"
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
              placeholder="Contoh: KREMBUNG, GUDANG 1, GUDANG 2"
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
              Nominal Denda / Klaim (Rp)
            </label>
            <input
              id="amount"
              type="number"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
              placeholder="50000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Keterangan Pelanggaran / Alasan Klaim
          </label>
          <textarea
            id="description"
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none"
            placeholder="Contoh: TDK TERKIRIM - GD LUPA DIMUAT KOOR :RIFA"
          />
        </div>

        <div>
          <label htmlFor="documentDetail" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
            Rincian Barang / Nomor Dokumen (Opsional)
          </label>
          <input
            id="documentDetail"
            type="text"
            value={documentDetail}
            onChange={(e) => setDocumentDetail(e.target.value)}
            className="w-full px-4 py-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all"
            placeholder="Contoh: Plat GalvaNIS KILAP 0.7x4x8 (-10 MULTI LOGAM)"
          />
        </div>

        {/* Status Pembayaran & Akun Uang (TACIK / KOORDINATOR) */}
        <div className="p-4 bg-zinc-50/70 border border-zinc-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Status Pembayaran
            </span>
            <div className="flex items-center bg-zinc-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setStatus('UNPAID')}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  status === 'UNPAID' ? 'bg-amber-100 text-amber-900 shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Belum Lunas
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('PAID');
                  if (!paidAt) setPaidAt(getTodayString());
                  if (!destinationAccount) setDestinationAccount('TACIK');
                }}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  status === 'PAID' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Lunas
              </button>
            </div>
          </div>

          {status === 'PAID' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/60 animate-in fade-in">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Tanggal Pelunasan
                </label>
                <input
                  type="date"
                  value={paidAt || getTodayString()}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 font-medium text-zinc-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Uang Masuk Ke:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinationAccount('TACIK')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                      destinationAccount === 'TACIK'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    TACIK
                  </button>
                  <button
                    type="button"
                    onClick={() => setDestinationAccount('KOORDINATOR')}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-semibold text-center transition-all ${
                      destinationAccount === 'KOORDINATOR'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    KOORDINATOR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5 mt-7 pt-4 border-t border-zinc-100">
        {editingRecord && onDelete && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Yakin ingin menghapus denda atas nama ${editingRecord.name}?`)) {
                onDelete(editingRecord.id);
                resetForm();
                onCancelEdit();
              }
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl text-xs transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Hapus Denda</span>
          </button>
        )}

        <div className="flex-1 flex gap-2.5 justify-end">
          <button
            type="button"
            onClick={() => {
              resetForm();
              onCancelEdit();
            }}
            className="flex items-center justify-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium py-2.5 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-200 text-xs sm:text-sm"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isExtracting}
            className="flex items-center justify-center gap-2 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 focus:ring-zinc-900 text-xs sm:text-sm"
          >
            {editingRecord ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
            {editingRecord ? 'Perbarui Data' : 'Simpan Denda'}
          </button>
        </div>
      </div>
    </form>
  );
}
