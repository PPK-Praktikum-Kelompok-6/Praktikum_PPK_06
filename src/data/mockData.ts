import {
  AttendanceRecord,
  PracticalSession,
  UserProfile,
} from '@/types/attendance';

export const MOCK_USERS: UserProfile[] = [
  // Asisten
  {
    id: 'ast-1',
    name: 'Muhammad Zaidan Alfarizi',
    role: 'ASSISTANT',
    identifier: 'AST-01',
  },
  {
    id: 'ast-2',
    name: 'Crystiano Bayu Satya Alves',
    role: 'ASSISTANT',
    identifier: 'AST-02',
  },
  // Praktikan
  {
    id: 'std-1',
    name: 'Bahir Ananda Wibowo',
    role: 'STUDENT',
    identifier: '24060124140184',
  },
  {
    id: 'std-2',
    name: 'Ahmad Dahlan',
    role: 'STUDENT',
    identifier: '24060124140101',
  },
  {
    id: 'std-3',
    name: 'Siti Nurhaliza',
    role: 'STUDENT',
    identifier: '24060124140102',
  },
  {
    id: 'std-4',
    name: 'Budi Santoso',
    role: 'STUDENT',
    identifier: '24060124140103',
  },
  {
    id: 'std-5',
    name: 'Citra Dewi',
    role: 'STUDENT',
    identifier: '24060124140104',
  },
];

export const MOCK_SESSIONS: PracticalSession[] = [
  {
    id: 'session-1',
    courseName: 'Pemrograman Web & Mobile',
    classCode: 'C1',
    room: 'Lab Komputer 2',
    timeSlot: '08.00 - 10.00 WIB',
    date: '2026-10-25T08:00:00.000Z',
    status: 'OPEN',
    assistantId: 'ast-1',
    assistantName: 'Muhammad Zaidan Alfarizi',
    totalStudents: 30,
  },
  {
    id: 'session-2',
    courseName: 'Struktur Data & Algoritma',
    classCode: 'B2',
    room: 'Lab Komputer 1',
    timeSlot: '13.00 - 15.00 WIB',
    date: '2026-10-26T13:00:00.000Z',
    status: 'NOT_STARTED',
    assistantId: 'ast-1',
    assistantName: 'Muhammad Zaidan Alfarizi',
    totalStudents: 32,
  },
  {
    id: 'session-3',
    courseName: 'Basis Data Lanjut',
    classCode: 'A1',
    room: 'Lab Basis Data',
    timeSlot: '10.00 - 12.00 WIB',
    date: '2026-10-24T10:00:00.000Z',
    status: 'CLOSED',
    assistantId: 'ast-2',
    assistantName: 'Crystiano Bayu Satya Alves',
    totalStudents: 28,
  },
];

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-1',
    sessionId: 'session-1',
    studentId: 'std-2',
    studentName: 'Ahmad Dahlan',
    studentNim: '24060124140101',
    timestamp: '2026-10-25T08:15:32.000Z',
    notes: 'Hadir tepat waktu',
  },
  {
    id: 'att-2',
    sessionId: 'session-1',
    studentId: 'std-3',
    studentName: 'Siti Nurhaliza',
    studentNim: '24060124140102',
    timestamp: '2026-10-25T08:18:10.000Z',
  },
  {
    id: 'att-3',
    sessionId: 'session-3',
    studentId: 'std-1',
    studentName: 'Bahir Ananda Wibowo',
    studentNim: '24060124140184',
    timestamp: '2026-10-24T10:05:40.000Z',
    notes: 'Hadir di sesi Basis Data',
  },
];
