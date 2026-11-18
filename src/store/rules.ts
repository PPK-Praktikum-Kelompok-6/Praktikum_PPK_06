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
 * Parsing rentang waktu slot ("08.00 - 10.00 WIB" atau "08:00 - 10:00")
 */
export function parseSessionTimeSlot(timeSlot: string): {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startText: string;
  endText: string;
} | null {
  if (!timeSlot) return null;
  const matches = [...timeSlot.matchAll(/(\d{1,2})[.:](\d{2})/g)];
  if (matches.length >= 2) {
    return {
      startHour: parseInt(matches[0][1], 10),
      startMinute: parseInt(matches[0][2], 10),
      endHour: parseInt(matches[1][1], 10),
      endMinute: parseInt(matches[1][2], 10),
      startText: `${matches[0][1]}.${matches[0][2]} WIB`,
      endText: `${matches[1][1]}.${matches[1][2]} WIB`,
    };
  }
  if (matches.length === 1) {
    const sh = parseInt(matches[0][1], 10);
    const sm = parseInt(matches[0][2], 10);
    return {
      startHour: sh,
      startMinute: sm,
      endHour: (sh + 2) % 24,
      endMinute: sm,
      startText: `${matches[0][1]}.${matches[0][2]} WIB`,
      endText: `${(sh + 2) % 24}.${matches[0][2]} WIB`,
    };
  }
  return null;
}

/**
 * Parsing tanggal sesi ke year, month (0-indexed), day
 */
export function getSessionDateParts(
  dateStr?: string
): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const ymdMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return {
      year: parseInt(ymdMatch[1], 10),
      month: parseInt(ymdMatch[2], 10) - 1,
      day: parseInt(ymdMatch[3], 10),
    };
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
    };
  }
  return null;
}

/**
 * Mengonstruksi waktu mulai dan selesai sesi secara akurat dari tanggal dan slot waktu
 */
export function getSessionDateRange(
  session: PracticalSession
): {
  start: Date;
  end: Date;
  startText: string;
  endText: string;
  dateText: string;
} | null {
  const times = parseSessionTimeSlot(session.timeSlot || '');
  if (!times) return null;

  const dateParts = getSessionDateParts(session.date);
  const now = new Date();
  const year = dateParts ? dateParts.year : now.getFullYear();
  const month = dateParts ? dateParts.month : now.getMonth();
  const day = dateParts ? dateParts.day : now.getDate();

  const start = new Date(year, month, day, times.startHour, times.startMinute, 0, 0);
  const end = new Date(year, month, day, times.endHour, times.endMinute, 0, 0);

  if (end.getTime() < start.getTime()) {
    end.setDate(end.getDate() + 1);
  }

  const dateText = `${day.toString().padStart(2, '0')}/${(month + 1).toString().padStart(2, '0')}/${year}`;

  return { start, end, startText: times.startText, endText: times.endText, dateText };
}

/**
 * Memeriksa apakah waktu mulai sesi praktikum sudah tiba.
 * Mengharuskan tanggal yang tepat dan waktu mulai yang telah tercapai.
 * Toleransi: Jika sesi baru saja dibuat (dalam 15 menit terakhir), asisten diizinkan membukanya langsung.
 */
export function isSessionStartTimeReached(
  session: PracticalSession,
  now: Date = new Date()
): {
  reached: boolean;
  scheduledTimeText: string;
  scheduledDateText: string;
  reason?: string;
} {
  const range = getSessionDateRange(session);
  if (!range) {
    return {
      reached: true,
      scheduledTimeText: session.timeSlot || '',
      scheduledDateText: '',
    };
  }

  // Toleransi 15 menit jika sesi baru dibuat
  if (session.createdAt) {
    const createdTime = new Date(session.createdAt).getTime();
    if (!isNaN(createdTime) && now.getTime() - createdTime < 15 * 60 * 1000) {
      return {
        reached: true,
        scheduledTimeText: range.startText,
        scheduledDateText: range.dateText,
      };
    }
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const sessionDayStart = new Date(
    range.start.getFullYear(),
    range.start.getMonth(),
    range.start.getDate(),
    0,
    0,
    0,
    0
  );

  // Jika tanggal praktikum di masa depan
  if (sessionDayStart.getTime() > todayStart.getTime()) {
    return {
      reached: false,
      scheduledTimeText: range.startText,
      scheduledDateText: range.dateText,
      reason: `Sesi dijadwalkan pada ${range.dateText} pukul ${range.startText}. Praktikum belum dapat dibuka sebelum tanggal tersebut.`,
    };
  }

  // Jika tanggal adalah hari ini, periksa jam mulai
  if (sessionDayStart.getTime() === todayStart.getTime() && now.getTime() < range.start.getTime()) {
    return {
      reached: false,
      scheduledTimeText: range.startText,
      scheduledDateText: range.dateText,
      reason: `Sesi dijadwalkan pukul ${range.startText}. Jam mulai praktikum belum tiba.`,
    };
  }

  return {
    reached: true,
    scheduledTimeText: range.startText,
    scheduledDateText: range.dateText,
  };
}

/**
 * Memeriksa apakah waktu praktikum telah berakhir (melewati jam selesai).
 * Digunakan untuk menutup sesi secara otomatis.
 */
export function isSessionExpired(
  session: PracticalSession,
  now: Date = new Date()
): { expired: boolean; endText: string; dateText: string } {
  const range = getSessionDateRange(session);
  if (!range) {
    return { expired: false, endText: '', dateText: '' };
  }

  const isPast = now.getTime() >= range.end.getTime();
  return {
    expired: isPast,
    endText: range.endText,
    dateText: range.dateText,
  };
}

/**
 * Pure business rule: Memeriksa apakah suatu sesi dapat dibuka oleh asisten.
 * Sesi hanya dapat dibuka jika statusnya saat ini 'NOT_STARTED', wewenang pengguna adalah 'ASSISTANT',
 * belum kadaluarsa, dan waktu mulai praktikum telah tiba.
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

  // Constraint: Waktu selesai tidak boleh sudah terlewati
  const expiredCheck = isSessionExpired(session);
  if (expiredCheck.expired) {
    return {
      allowed: false,
      reason: `Waktu praktikum telah selesai (${expiredCheck.dateText} ${expiredCheck.endText}). Sesi yang sudah melewati batas waktu tidak dapat dibuka.`,
    };
  }

  // Constraint: Waktu mulai sesi harus sudah tiba
  const timeCheck = isSessionStartTimeReached(session);
  if (!timeCheck.reached) {
    return {
      allowed: false,
      reason:
        timeCheck.reason ||
        `Sesi praktikum belum masuk jam mulai (${timeCheck.scheduledTimeText}). Sesi hanya dapat berjalan pada waktu dan tanggal yang tepat.`,
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
  // Constraint: Waktu praktikum telah berakhir (otomatis tutup)
  const expiredCheck = isSessionExpired(session);
  if (expiredCheck.expired) {
    return {
      allowed: false,
      reason: `Waktu praktikum telah berakhir (${expiredCheck.dateText} ${expiredCheck.endText}). Sesi praktikum ditutup secara otomatis.`,
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
