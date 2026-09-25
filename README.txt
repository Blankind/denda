Auto-create tab StockOpname & StockLogs. Tidak perlu buat tab manual lagi.

BARU:
  api/_stock-sheets.ts   fungsi ensureStockSheets() — cek & buat tab + header
                         kalau belum ada

UPDATE:
  api/stock.ts
  api/stock-detail.ts
  api/stock-logs.ts
    -> masing-masing panggil ensureStockSheets() sebelum baca/tulis data

Cara kerja: panggilan API pertama ke /api/stock, /api/stock/:id, atau
/api/stock-logs akan otomatis cek spreadsheet. Kalau tab "StockOpname" atau
"StockLogs" belum ada, dibuatkan otomatis lengkap dengan header:

  StockOpname: id | createdAt | period | itemName | branch | name |
               qtySelisih | systemValue | claimValue | installmentsJson |
               isPaidOff | description
  StockLogs:   id | timestamp | action | details

Tidak menyentuh api/_sheets.ts (kredensial aman).
