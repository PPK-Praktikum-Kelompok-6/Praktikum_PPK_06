/**
 * Single source of truth untuk daftar mata kuliah praktikum resmi & normalisasi data lama.
 */
export const OFFICIAL_COURSES = [
  'Dasar Sistem',
  'Dasar Pemrograman',
  'Struktur Data',
  'Algoritma Pemrograman',
  'Pemrograman Berbasis Objek',
  'Basis Data',
  'Sistem Operasi',
  'Jaringan Komputer',
  'Grafik dan Teknik Interaktif',
  'Pengembangan Platform Khusus',
  'Pembelajaran Mesin',
  'Analisis dan Strategi Algoritma',
] as const;

export type OfficialCourseName = (typeof OFFICIAL_COURSES)[number];

export const LEGACY_COURSE_MAP: Record<string, OfficialCourseName> = {
  'basis data lanjut': 'Basis Data',
  'struktur data & algoritma': 'Struktur Data',
  'struktur data dan algoritma': 'Struktur Data',
  'pemrograman perangkat keras': 'Pengembangan Platform Khusus',
  ppk: 'Pengembangan Platform Khusus',
  'pemrograman web & mobile': 'Pengembangan Platform Khusus',
  'pemrograman web dan mobile': 'Pengembangan Platform Khusus',
  'kecerdasan buatan': 'Pembelajaran Mesin',
  'praktikum jaringan komputer': 'Jaringan Komputer',
};

/** Mengubah nama mata kuliah lama atau beda kapitalisasi ke nama resmi. */
export function normalizeCourseName(raw?: string): string {
  if (!raw || !raw.trim()) return '';
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  const key = collapsed.toLowerCase();

  if (key in LEGACY_COURSE_MAP) {
    return LEGACY_COURSE_MAP[key];
  }

  const officialMatch = OFFICIAL_COURSES.find((c) => c.toLowerCase() === key);
  return officialMatch ?? collapsed;
}

/** Mengecek apakah nama mata kuliah termasuk salah satu dari 12 mata kuliah resmi. */
export function isOfficialCourse(name?: string): boolean {
  if (!name) return false;
  return OFFICIAL_COURSES.includes(name as OfficialCourseName);
}

const STOPWORDS = new Set(['DAN', 'ATAU', 'DENGAN', 'UNTUK', 'PADA', 'DI', 'KE', 'DARI', 'OF', 'AND']);

/**
 * Menghasilkan singkatan nama mata kuliah (contoh: "Pengembangan Platform Khusus" -> "PPK",
 * "Basis Data" -> "BD", "Struktur Data" -> "SD", "Jaringan Komputer" -> "JK").
 */
export function generateCoursePrefix(courseName: string): string {
  const words = courseName
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.toUpperCase())
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));

  if (words.length >= 2) {
    return words
      .slice(0, 4)
      .map((w) => w[0])
      .join('');
  }
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return 'PPK';
}
