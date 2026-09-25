File baru & update untuk modul "Selisih Stock".

BARU:
  src/types.ts            (update: tambah tipe Installment, StockOpnameRecord)
  src/pages/StockOpnamePage.tsx
  src/components/StockOpnameForm.tsx
  src/components/InstallmentModal.tsx
  api/stock.ts
  api/stock-detail.ts

UPDATE:
  src/App.tsx     -> tambah switcher halaman "Denda Operasional" / "Selisih Stock"
  vercel.json     -> tambah rewrite /api/stock/:id

WAJIB SEBELUM DIPAKAI:
  Buat tab baru di spreadsheet bernama persis: StockOpname
  Isi header baris 1 (A1:K1):
  id | createdAt | itemName | branch | name | qtySelisih | systemValue | claimValue | installmentsJson | isPaidOff | description

Tidak menyentuh api/_sheets.ts (kredensial aman).
