import { formatDateIndonesian, formatTime, formatTimeRange } from './formatTime';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Self-check for formatTime utils
const date = new Date(2026, 9, 24, 8, 30); // 24 Okt 2026 08:30
const iso = date.toISOString();

assert(
  formatTime(iso) === `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} WIB`,
  'formatTime must format hours and minutes with WIB suffix'
);

const end = new Date(2026, 9, 24, 10, 0);
const endIso = end.toISOString();
assert(
  formatTimeRange(iso, endIso) === `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} - ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')} WIB`,
  'formatTimeRange must format start and end with WIB suffix'
);

const formattedDate = formatDateIndonesian(iso);
assert(formattedDate.includes('24 Okt 2026'), 'formatDateIndonesian should include date, month, year');
assert(formattedDate.includes('Sabtu'), 'formatDateIndonesian should include Indonesian day name');

console.log('✓ All formatTime assertions passed successfully.');
