import { getSessionDateRange } from '@/store/rules';
import {
  AttendancePunctuality,
  AttendanceRecord,
  PracticalSession,
} from '@/types/attendance';

export const DEFAULT_GRACE_PERIOD_MINUTES = 15;
export const DEFAULT_FINE_AMOUNT = 10000;

export interface LatenessEvaluation {
  status: Extract<AttendancePunctuality, 'ON_TIME' | 'LATE'>;
  isLate: boolean;
  lateMinutes: number;
  graceDeadlineIso: string;
}

/**
 * Pure business rule (tanpa React/Firestore) untuk mengevaluasi keterlambatan presensi (SRS-S4-04):
 * - checkIn <= sessionStart + gracePeriodMinutes  => ON_TIME (isLate: false, lateMinutes: 0)
 * - checkIn >  sessionStart + gracePeriodMinutes  => LATE    (isLate: true,  lateMinutes >= 1)
 */
export function evaluateLateness(
  checkInIso: string,
  sessionStartIso: string,
  gracePeriodMinutes: number = DEFAULT_GRACE_PERIOD_MINUTES
): LatenessEvaluation {
  const safeGrace = Number.isFinite(gracePeriodMinutes)
    ? Math.max(0, Math.floor(gracePeriodMinutes))
    : DEFAULT_GRACE_PERIOD_MINUTES;

  const checkInMs = new Date(checkInIso).getTime();
  const startMs = new Date(sessionStartIso).getTime();

  // Jika salah satu timestamp tidak valid, anggap tepat waktu agar tidak memberi denda keliru
  if (Number.isNaN(checkInMs) || Number.isNaN(startMs)) {
    const fallbackDeadline = Number.isNaN(startMs)
      ? new Date().toISOString()
      : new Date(startMs + safeGrace * 60_000).toISOString();
    return {
      status: 'ON_TIME',
      isLate: false,
      lateMinutes: 0,
      graceDeadlineIso: fallbackDeadline,
    };
  }

  const deadlineMs = startMs + safeGrace * 60_000;
  const graceDeadlineIso = new Date(deadlineMs).toISOString();

  if (checkInMs <= deadlineMs) {
    return {
      status: 'ON_TIME',
      isLate: false,
      lateMinutes: 0,
      graceDeadlineIso,
    };
  }

  const diffMs = checkInMs - deadlineMs;
  const lateMinutes = Math.max(1, Math.ceil(diffMs / 60_000));

  return {
    status: 'LATE',
    isLate: true,
    lateMinutes,
    graceDeadlineIso,
  };
}

/**
 * Menentukan waktu mulai acuan sesi praktikum (ISO string) dari jadwal (date + timeSlot),
 * dengan fallback ke openedAt atau waktu saat ini bila timeSlot tidak dapat diparsing.
 */
export function resolveSessionStartIso(
  session: Partial<Pick<PracticalSession, 'date' | 'timeSlot' | 'openedAt'>> & {
    date?: string;
    timeSlot?: string;
  }
): string {
  const range = getSessionDateRange(session as PracticalSession);
  if (range) {
    return range.start.toISOString();
  }
  if (session.openedAt && !Number.isNaN(new Date(session.openedAt).getTime())) {
    return new Date(session.openedAt).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Mengembalikan true hanya untuk rekaman yang benar-benar hadir (ON_TIME atau LATE).
 * Rekaman EXCUSED_ABSENCE (izin disetujui) tidak pernah dihitung sebagai hadir.
 */
export function isPresentAttendanceRecord(record: AttendanceRecord): boolean {
  return record.attendanceStatus !== 'EXCUSED_ABSENCE';
}

/**
 * Memformat angka rupiah secara konsisten lintas platform (React Native / Web).
 */
export function formatRupiah(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  const formatted = safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
}
