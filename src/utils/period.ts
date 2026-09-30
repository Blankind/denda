// Siklus periode perusahaan: tanggal 26 bulan sebelumnya s/d tanggal 25 bulan berjalan.
// Contoh: "2026-09" mencakup 26 Agustus 2026 - 25 September 2026.

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Hitung label periode (YYYY-MM) dari sebuah tanggal, mengikuti siklus 26-25.
export function getPeriodFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-indexed
  const day = d.getDate();
  if (day >= 26) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// "2026-09" -> "September 2026 (26 Agu - 25 Sep)"
export function formatPeriodLabel(period: string): string {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // 0-indexed
  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) return period;

  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }

  return `${MONTH_FULL[month]} ${year} (26 ${MONTH_ABBR[prevMonth]} - 25 ${MONTH_ABBR[month]})`;
}
