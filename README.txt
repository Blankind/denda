Update fitur: dashboard per cabang, siklus klaim bulanan, pelunasan massal + kebijakan
global, dan log terpisah untuk modul Selisih Stock.

FILE BARU:
  src/components/ClaimPayoffModal.tsx   popup lunasi massal (search nama, kebijakan
                                         bayar global: lunasi penuh / nominal manual,
                                         centang tutup siklus)
  src/pages/DashboardPage.tsx           dashboard per cabang, gabungan Denda Operasional
                                         + Selisih Stock, jadi tab ke-3
  api/stock-logs.ts                     GET/POST log aktivitas modul Selisih Stock
                                         (sheet StockLogs, terpisah dari Logs milik
                                         Denda Operasional)

UPDATE:
  src/types.ts               tambah field `period` (YYYY-MM) di StockOpnameRecord
  src/App.tsx                tambah tab "Dashboard" (paling kiri)
  src/components/StockOpnameForm.tsx
                              tambah input Periode (bulan), dukung prop `seed` untuk
                              klaim baru dari item yang sudah ditutup
  src/pages/StockOpnamePage.tsx
                              tambah: filter cabang, tombol "Lunasi" (buka
                              ClaimPayoffModal), tombol siklus baru (ikon panah putar)
                              pada item yang sudah Lunas/Cukup, pencatatan log tiap aksi
  api/stock.ts, api/stock-detail.ts
                              tambah kolom `period`. Urutan kolom BARU (A:L):
                              id | createdAt | period | itemName | branch | name |
                              qtySelisih | systemValue | claimValue | installmentsJson |
                              isPaidOff | description

WAJIB DI SPREADSHEET SEBELUM PAKAI:
  1. Tab "StockOpname" — kalau sudah ada dari update sebelumnya dengan urutan kolom
     LAMA (tanpa period di posisi C), HAPUS dan buat ulang dengan header baru ini
     di baris 1 (kalau belum ada data penting, cara termudah):
     id | createdAt | period | itemName | branch | name | qtySelisih | systemValue |
     claimValue | installmentsJson | isPaidOff | description
  2. Tab baru "StockLogs", header baris 1:
     id | timestamp | action | details

CATATAN LOGIKA "SIKLUS BARU":
  Centang "Lunas/Cukup" pada item = tutup siklus klaim itu. Kalau bulan berikutnya
  ketemu selisih baru untuk item yang sama, JANGAN edit item lama — klik ikon panah
  putar di baris item yang sudah Lunas/Cukup untuk membuat klaim baru (id baru,
  periode baru, riwayat angsuran kosong), supaya riwayat lama tidak tertimpa.
