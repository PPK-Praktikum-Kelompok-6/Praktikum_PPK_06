/**
 * Time and date formatting utilities (owner: Bayu).
 * Formats ISO strings or timestamps to user-facing Indonesian text.
 */

/**
 * Formats time range e.g. "08:00 - 10:00 WIB"
 */
export function formatTimeRange(start: string, end: string): string {
  const formatHourMin = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return `${formatHourMin(start)} - ${formatHourMin(end)} WIB`;
}

/**
 * Formats date e.g. "Jumat, 24 Okt 2026"
 */
const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDONESIAN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
];

export function formatDateIndonesian(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const dayName = INDONESIAN_DAYS[d.getDay()];
  const date = d.getDate();
  const monthName = INDONESIAN_MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${date} ${monthName} ${year}`;
}

/**
 * Formats single timestamp e.g. "08:30 WIB"
 */
export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} WIB`;
}

