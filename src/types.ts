export interface PenaltyRecord {
  id: string;
  createdAt: string;
  name: string;
  branch: string;
  amount: number;
  description: string;
  documentDetail: string;
  status?: 'UNPAID' | 'PAID';
  paidAt?: string;
  destinationAccount?: 'TACIK' | 'KOORDINATOR' | string;
}

export interface Installment {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface StockOpnameRecord {
  id: string;
  createdAt: string;
  period: string; // format YYYY-MM, siklus klaim per bulan
  itemName: string;
  branch: string;
  name: string; // PIC / karyawan penanggung jawab
  qtySelisih?: number;
  systemValue: number; // nilai selisih murni dari sistem
  claimValue?: number; // besaran yang diklaimkan sesuai kebijakan atasan (bisa kosong dulu)
  installments: Installment[]; // riwayat angsuran
  isPaidOff: boolean; // centang "Lunas/Cukup" -> menutup siklus klaim ini, pengampunan dihitung dari systemValue - claimValue
  isNotRecognized?: boolean; // centang "Tidak Diakui sebagai Claim" -> diabaikan, tidak dihitung ke total claim
  description?: string;
  historyRaw?: string; // teks mentah kolom "History Reconciliation" dari file excel yang di-import, khusus item ini
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
}

