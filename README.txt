BARU:
  src/utils/period.ts        siklus 26-25 (getPeriodFromDate, formatPeriodLabel)

UPDATE:
  src/pages/DashboardPage.tsx
    - filter Periode di header (default: Semua Periode)
    - Denda Operasional: periode dihitung dari createdAt pakai siklus 26-25
      (tidak ada field period eksplisit di modul itu)
    - Selisih Stock: pakai field `period` yang sudah ada apa adanya
    - Rincian baru per cabang & total gabungan: "Kerugian (+)" vs "Kredit/Lebih (-)",
      dipecah dari systemValue asli (bukan claimValue), sesuai fix checkbox
      "Abaikan nilai minus" sebelumnya
    - Angka akumulasi lama (stockClaim, stockSisa, dendaUnpaid, dst) TIDAK diubah
      logikanya, cuma sekarang ikut terpengaruh filter periode kalau dipilih
