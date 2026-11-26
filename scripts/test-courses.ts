import {
  generateCoursePrefix,
  isOfficialCourse,
  OFFICIAL_COURSES,
  normalizeCourseName,
} from '../src/constants/courses';
import { DEFAULT_CLASSES, MOCK_SESSIONS } from '../src/data/mockData';

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: boolean, message: string): void {
  if (!condition) fail(message);
}

console.log('=== RUNNING TESTS FOR OFFICIAL COURSES & SEED CATALOG ===\n');

const EXPECTED_COURSES = [
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

// 1. Official catalog check
assert(
  OFFICIAL_COURSES.length === 12,
  `Expected 12 official courses, got ${OFFICIAL_COURSES.length}`
);
EXPECTED_COURSES.forEach((expected, idx) => {
  assert(
    OFFICIAL_COURSES[idx] === expected,
    `Course mismatch at index ${idx}: expected "${expected}", got "${OFFICIAL_COURSES[idx]}"`
  );
});
console.log('[TEST 1] OFFICIAL_COURSES contains exact 12 courses in order -> PASS');

// 2. Legacy normalization check
const legacyInputs = [
  'Basis Data Lanjut',
  'Struktur Data & Algoritma',
  'Pemrograman Perangkat Keras',
  'Pemrograman Web & Mobile',
  'Kecerdasan Buatan',
  'Praktikum Jaringan Komputer',
  'Struktur data',
  '  analisis  dan   strategi algoritma ',
];
for (const raw of legacyInputs) {
  const normalized = normalizeCourseName(raw);
  assert(
    isOfficialCourse(normalized),
    `Expected "${raw}" -> "${normalized}" to be an official course`
  );
}
console.log('[TEST 2] All legacy course strings normalize to official courses -> PASS');

// 3. Default classes cover all 12 official courses cleanly with unique codes/IDs
assert(
  DEFAULT_CLASSES.length === 12,
  `Expected 12 DEFAULT_CLASSES, got ${DEFAULT_CLASSES.length}`
);
const defaultCourseNames = new Set(DEFAULT_CLASSES.map((c) => c.courseName));
assert(defaultCourseNames.size === 12, 'Expected 12 unique courseNames in DEFAULT_CLASSES');
for (const course of OFFICIAL_COURSES) {
  assert(defaultCourseNames.has(course), `Missing DEFAULT_CLASSES entry for ${course}`);
}
assert(new Set(DEFAULT_CLASSES.map((c) => c.id)).size === 12, 'Duplicate class ids in DEFAULT_CLASSES');
assert(new Set(DEFAULT_CLASSES.map((c) => c.classCode)).size === 12, 'Duplicate classCodes in DEFAULT_CLASSES');
assert(new Set(DEFAULT_CLASSES.map((c) => c.studentJoinCode)).size === 12, 'Duplicate studentJoinCodes in DEFAULT_CLASSES');
assert(new Set(DEFAULT_CLASSES.map((c) => c.assistantInviteCode)).size === 12, 'Duplicate assistantInviteCodes in DEFAULT_CLASSES');

// Demo students stay enrolled only in A1, B2, C1 by default
for (const cls of DEFAULT_CLASSES) {
  if (['A1', 'B2', 'C1'].includes(cls.classCode)) {
    assert(
      (cls.studentIds?.length ?? 0) > 0,
      `Expected ${cls.classCode} to retain demo students`
    );
  } else {
    assert(
      (cls.studentIds?.length ?? 0) === 0,
      `Expected ${cls.classCode} to start with empty studentIds`
    );
  }
}
console.log('[TEST 3] DEFAULT_CLASSES covers all 12 courses with unique identifiers -> PASS');

// 4. Mock sessions use official courses only
for (const sess of MOCK_SESSIONS) {
  assert(
    isOfficialCourse(sess.courseName),
    `Mock session ${sess.id} has non-official course ${sess.courseName}`
  );
}
console.log('[TEST 4] MOCK_SESSIONS use official courses only -> PASS');

// 5. Unique course prefixes across all 12 courses
const prefixes = new Set(OFFICIAL_COURSES.map((c) => generateCoursePrefix(c)));
assert(prefixes.size === 12, `Expected 12 unique prefixes, got ${prefixes.size}`);
console.log('[TEST 5] generateCoursePrefix produces 12 unique prefixes -> PASS');

console.log('\n=== ALL OFFICIAL COURSE TESTS PASSED ===');
