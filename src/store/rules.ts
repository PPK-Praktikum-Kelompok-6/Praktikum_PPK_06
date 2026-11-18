import {
  AttendanceRecord,
  PracticalSession,
  UserRole,
} from '@/types/attendance';

export interface RuleResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Memeriksa apakah waktu mulai sesi praktikum sudah tiba.
 * Format timeSlot yang didukung: "HH.MM - HH.MM WIB" atau "HH:MM - HH:MM".
 * Toleransi: Jika sesi baru saja dibuat (dalam 15 menit terakhir), sesi diizinkan dibuka langsung ("saat kelas dibuat").
 */
export function isSessionStartTimeReached(
  session: PracticalSession,
  now: Date = new Date()
): { reached: boolean; scheduledTimeText: string } {
  const slot = session.timeSlot || '';
  const match = slot.match(/(\d{1,2})[.:](\d{2})/);
  const scheduledTimeText = match ? `${match[1]}.${match[2]} WIB` : slot;

  // Jika sesi baru saja dibuat dalam rentang 15 menit terakhir
  if (session.createdAt) {
    const createdTime = new Date(session.createdAt).getTime();
    if (!isNaN(createdTime) && now.getTime() - createdTime < 15 * 60 * 1000) {
      return { reached: true, scheduledTimeText };
    }
  }

  if (!match) {
    return { reached: true, scheduledTimeText };
  }

  const startHour = parseInt(match[1], 10);
  const startMinute = parseInt(match[2], 10);

  let sessionDate = new Date();
  if (session.date) {
    const parsedDate = new Date(session.date);
    if (!isNaN(parsedDate.getTime())) {
      sessionDate = parsedDate;
    }
  }

  const targetStart = new Date(sessionDate);
  targetStart.setHours(startHour, startMinute, 0, 0);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sessionDayStart = new Date(sessionDate);
  sessionDayStart.setHours(0, 0, 0, 0);

  if (sessionDayStart.getTime() > todayStart.getTime()) {
    return { reached: false, scheduledTimeText };
  }

  if (sessionDayStart.getTime() === todayStart.getTime()) {
    if (now.getTime() < targetStart.getTime()) {
      return { reached: false, scheduledTimeText };
    }
  }

  return { reached: true, scheduledTimeText };
}

/**
 * Pure business rule: Memeriksa apakah suatu sesi dapat dibuka oleh asisten.
 * Sesi hanya dapat dibuka jika statusnya saat ini 'NOT_STARTED', wewenang pengguna adalah 'ASSISTANT',
 * dan waktu mulai praktikum telah tiba (atau baru saja dibuat).
 */
export function canOpen(
  session: PracticalSession | undefined,
  userRole?: UserRole
): RuleResult {
  if (userRole && userRole !== 'ASSISTANT') {
    return {
      allowed: false,
      reason: 'Hanya Asisten Praktikum yang berwenang membuka sesi praktikum.',
    };
  }
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

  // Constraint: Waktu mulai sesi harus sudah tiba
  const timeCheck = isSessionStartTimeReached(session);
  if (!timeCheck.reached) {
    return {
      allowed: false,
      reason: `Sesi praktikum belum masuk jam mulai (${timeCheck.scheduledTimeText}). Sesi hanya dapat dibuka saat jam mulai telah tiba atau saat kelas baru dibuat.`,
    };
  }

  return { allowed: true };
}

/**
 * Pure business rule: Memeriksa apakah suatu sesi dapat ditutup oleh asisten.
 * Sesi hanya dapat ditutup jika statusnya saat ini 'OPEN' dan wewenang pengguna adalah 'ASSISTANT'.
 */
export function canClose(
  session: PracticalSession | undefined,
  userRole?: UserRole
): RuleResult {
  if (userRole && userRole !== 'ASSISTANT') {
    return {
      allowed: false,
      reason: 'Hanya Asisten Praktikum yang berwenang menutup sesi praktikum.',
    };
  }
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
 * Izin diberikan hanya jika sesi 'OPEN', praktikan terdaftar di kelas sesi tersebut, dan belum pernah hadir.
 */
export function canAttend(
  session: PracticalSession | undefined,
  records: AttendanceRecord[],
  studentId: string,
  studentClasses?: string[]
): RuleResult {
  if (!session) {
    return { allowed: false, reason: 'Sesi praktikum tidak ditemukan.' };
  }

  // Constraint kelas: Praktikan hanya boleh presensi di kelas yang terdaftar
  if (studentClasses && studentClasses.length > 0) {
    const isEnrolled = studentClasses.some(
      (c) => c.toUpperCase() === session.classCode.toUpperCase()
    );
    if (!isEnrolled) {
      return {
        allowed: false,
        reason: `Akses ditolak: Anda tidak terdaftar di kelas ${session.classCode} (${session.courseName}). Anda hanya dapat presensi pada kelas yang Anda ikuti.`,
      };
    }
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
