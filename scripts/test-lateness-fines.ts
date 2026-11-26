import {
  DEFAULT_FINE_AMOUNT,
  DEFAULT_GRACE_PERIOD_MINUTES,
  evaluateLateness,
  formatRupiah,
  isPresentAttendanceRecord,
  resolveSessionStartIso,
} from '../src/utils/lateness';

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed (${label}): expected ${String(expected)}, got ${String(actual)}`
    );
  }
}

console.log('=== RUNNING TESTS FOR SPRINT 4 LATENESS & FINES (BAYU) ===\n');

const sessionStart = '2026-11-26T08:00:00.000Z';

// 1. Check-in sebelum sesi mulai -> ON_TIME
const early = evaluateLateness('2026-11-26T07:55:00.000Z', sessionStart, 15);
assertEqual(early.status, 'ON_TIME', 'early.status');
assertEqual(early.isLate, false, 'early.isLate');
assertEqual(early.lateMinutes, 0, 'early.lateMinutes');
console.log('[TEST 1] Early check-in -> ON_TIME PASS');

// 2. Check-in tepat di batas akhir grace period (08:15:00.000Z) -> ON_TIME (WAJIB)
const onBoundary = evaluateLateness('2026-11-26T08:15:00.000Z', sessionStart, 15);
assertEqual(onBoundary.status, 'ON_TIME', 'onBoundary.status');
assertEqual(onBoundary.isLate, false, 'onBoundary.isLate');
assertEqual(onBoundary.lateMinutes, 0, 'onBoundary.lateMinutes');
console.log('[TEST 2] Exact grace deadline boundary -> ON_TIME PASS');

// 3. Check-in 1 detik lewat batas grace period (08:15:01.000Z) -> LATE (+1 mnt)
const oneSecLate = evaluateLateness('2026-11-26T08:15:01.000Z', sessionStart, 15);
assertEqual(oneSecLate.status, 'LATE', 'oneSecLate.status');
assertEqual(oneSecLate.isLate, true, 'oneSecLate.isLate');
assertEqual(oneSecLate.lateMinutes, 1, 'oneSecLate.lateMinutes');
console.log('[TEST 3] 1 second past grace period -> LATE (+1 mnt) PASS');

// 4. Check-in 23 menit lewat grace period (08:38:00.000Z) -> LATE (+23 mnt)
const late23 = evaluateLateness('2026-11-26T08:38:00.000Z', sessionStart, 15);
assertEqual(late23.status, 'LATE', 'late23.status');
assertEqual(late23.isLate, true, 'late23.isLate');
assertEqual(late23.lateMinutes, 23, 'late23.lateMinutes');
console.log('[TEST 4] 23 minutes past grace period -> LATE (+23 mnt) PASS');

// 5. EXCUSED_ABSENCE tidak pernah dihitung hadir
assertEqual(
  isPresentAttendanceRecord({
    id: 'att-1',
    sessionId: 'sess-1',
    studentId: 'std-1',
    studentName: 'Budi',
    studentNim: '123',
    timestamp: sessionStart,
    attendanceStatus: 'EXCUSED_ABSENCE',
  }),
  false,
  'excused not counted as present'
);
assertEqual(
  isPresentAttendanceRecord({
    id: 'att-2',
    sessionId: 'sess-1',
    studentId: 'std-2',
    studentName: 'Siti',
    studentNim: '456',
    timestamp: sessionStart,
    attendanceStatus: 'LATE',
  }),
  true,
  'late counted as present'
);
console.log('[TEST 5] EXCUSED_ABSENCE excluded from present count PASS');

// 6. resolveSessionStartIso & formatRupiah defaults
const resolvedIso = resolveSessionStartIso({
  date: '2026-11-26',
  timeSlot: '08.00 - 10.00 WIB',
});
assertEqual(new Date(resolvedIso).getHours(), 8, 'resolved hour');
assertEqual(new Date(resolvedIso).getMinutes(), 0, 'resolved minute');
assertEqual(DEFAULT_GRACE_PERIOD_MINUTES, 15, 'default grace period');
assertEqual(DEFAULT_FINE_AMOUNT, 10000, 'default fine amount');
assertEqual(formatRupiah(10000), 'Rp 10.000', 'formatRupiah');
console.log('[TEST 6] resolveSessionStartIso & formatRupiah PASS');

console.log('\n=== ALL SPRINT 4 LATENESS TESTS PASSED ===');
