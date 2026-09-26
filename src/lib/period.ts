export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Ambang batas periode pertama. Semua data mulai dari kapan pun sampai tanggal ini
// dianggap 1 periode saja: "September <tahun ambang>". Setelah tanggal ini,
// periode berjalan normal mengikuti siklus 26 (bulan sebelumnya) - 25 (bulan berjalan).
// Contoh: Periode Oktober = 26 September - 25 Oktober.
const FIRST_PERIOD_CUTOFF_YEAR = 2026;
const FIRST_PERIOD_CUTOFF_MONTH = 8; // 0-indexed, 8 = September
const FIRST_PERIOD_CUTOFF_DAY = 25;

function endOfCutoffDay(): Date {
  return new Date(FIRST_PERIOD_CUTOFF_YEAR, FIRST_PERIOD_CUTOFF_MONTH, FIRST_PERIOD_CUTOFF_DAY, 23, 59, 59, 999);
}

/**
 * Menentukan label periode (mis. "Oktober 2026") dari sebuah tanggal, mengikuti
 * siklus 26-25: tanggal 26 s/d akhir bulan masuk periode bulan berikutnya,
 * tanggal 1 s/d 25 masuk periode bulan itu sendiri.
 *
 * Kasus khusus (bootstrap): seluruh data dari awal sampai tanggal ambang batas
 * (lihat FIRST_PERIOD_CUTOFF_* di atas) selalu dibaca sebagai 1 periode yaitu
 * "September <tahun ambang>", supaya data lama sebelum sistem periode ini ada
 * tidak kepecah-pecah ke banyak periode kecil.
 */
export function getPeriodLabel(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  if (d.getTime() <= endOfCutoffDay().getTime()) {
    return `${MONTH_NAMES[FIRST_PERIOD_CUTOFF_MONTH]} ${FIRST_PERIOD_CUTOFF_YEAR}`;
  }

  let month = d.getMonth();
  let year = d.getFullYear();
  if (d.getDate() >= 26) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return `${MONTH_NAMES[month]} ${year}`;
}

/** Rentang tanggal (label saja) dari sebuah periode, untuk ditampilkan sebagai keterangan. */
export function getPeriodRangeLabel(periodLabel: string): string {
  const [monthName, yearStr] = periodLabel.split(' ');
  const monthIdx = MONTH_NAMES.indexOf(monthName);
  const year = Number(yearStr);
  if (monthIdx < 0 || !year) return '';

  if (monthIdx === FIRST_PERIOD_CUTOFF_MONTH && year === FIRST_PERIOD_CUTOFF_YEAR) {
    return `s/d 25 ${MONTH_NAMES[FIRST_PERIOD_CUTOFF_MONTH]} ${FIRST_PERIOD_CUTOFF_YEAR}`;
  }

  let prevMonth = monthIdx - 1;
  let prevYear = year;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  return `26 ${MONTH_NAMES[prevMonth]} ${prevYear} - 25 ${monthName} ${year}`;
}

/** Key numerik untuk sorting kronologis label periode ("Januari 2026" < "Februari 2026" dst). */
export function periodSortKey(periodLabel: string): number {
  const [monthName, yearStr] = periodLabel.split(' ');
  const monthIdx = MONTH_NAMES.indexOf(monthName);
  const year = Number(yearStr) || 0;
  return year * 12 + (monthIdx < 0 ? 0 : monthIdx);
}

/** Ambil daftar label periode unik dari kumpulan tanggal, terurut dari yang terbaru. */
export function collectPeriods(dates: (string | Date)[]): string[] {
  const set = new Set<string>();
  for (const d of dates) {
    const label = getPeriodLabel(d);
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => periodSortKey(b) - periodSortKey(a));
}
