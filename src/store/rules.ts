import {
  AttendanceRecord,
  PracticalSession,
} from '@/types/attendance';

export interface RuleResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Pure business rule: Memeriksa apakah suatu sesi dapat dibuka oleh asisten.
 * Sesi hanya dapat dibuka jika statusnya saat ini 'NOT_STARTED'.
 */
export function canOpen(session: PracticalSession | undefined): RuleResult {
  if (!session) {
    return { allowed: false, reason: 'Sesi praktikum tidak ditemukan.' };
  }
  if (session.status === 'OPEN') {
    return { allowed: false, reason: 'Sesi sudah dalam status dibuka.' };
  }
  if (session.status === 'CLOSED') {
    return {
      allowed: false,
      reason: 'Sesi yang sudah ditutup tidak dapat dibuka kembali.',
    };
  }
  return { allowed: true };
}

/**
 * Pure business rule: Memeriksa apakah suatu sesi dapat ditutup oleh asisten.
 * Sesi hanya dapat ditutup jika statusnya saat ini 'OPEN'.
 */
export function canClose(session: PracticalSession | undefined): RuleResult {
  if (!session) {
    return { allowed: false, reason: 'Sesi praktikum tidak ditemukan.' };
  }
  if (session.status === 'CLOSED') {
    return { allowed: false, reason: 'Sesi sudah dalam status ditutup.' };
  }
  if (session.status === 'NOT_STARTED') {
    return {
      allowed: false,
      reason: 'Sesi belum dimulai sehingga tidak dapat ditutup.',
    };
  }
  return { allowed: true };
}

/**
 * Pure business rule: Memeriksa apakah praktikan sudah tercatat hadir pada sesi tertentu.
 */
export function isAlreadyAttended(
  records: AttendanceRecord[],
  sessionId: string,
  studentId: string
): boolean {
  return records.some(
    (record) => record.sessionId === sessionId && record.studentId === studentId
  );
}

/**
 * Pure business rule: Memeriksa apakah praktikan diizinkan melakukan presensi pada sesi.
 * Izin diberikan hanya jika sesi 'OPEN' dan praktikan belum pernah hadir.
 */
export function canAttend(
  session: PracticalSession | undefined,
  records: AttendanceRecord[],
  studentId: string
): RuleResult {
  if (!session) {
    return { allowed: false, reason: 'Sesi praktikum tidak ditemukan.' };
  }
  if (session.status === 'NOT_STARTED') {
    return {
      allowed: false,
      reason: 'Sesi praktikum belum dibuka oleh asisten.',
    };
  }
  if (session.status === 'CLOSED') {
    return {
      allowed: false,
      reason: 'Sesi praktikum sudah ditutup. Presensi baru tidak dapat diterima.',
    };
  }
  if (isAlreadyAttended(records, session.id, studentId)) {
    return {
      allowed: false,
      reason: 'Anda sudah melakukan presensi pada sesi ini.',
    };
  }
  return { allowed: true };
}
