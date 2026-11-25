import {
  AttendanceRecord,
  PracticalSession,
  UserProfile,
} from '@/types/attendance';

export const MOCK_USERS: UserProfile[] = [
  // Asisten
  {
    id: 'SxbmMvFvLcRUPSEhOiyJRfNpOzg1',
    name: 'Muhammad Zaidan Alfarizi',
    role: 'ASSISTANT',
    identifier: 'AST-01',
  },
  {
    id: 'EW1rsd5cTZR6iW0xDQdchJ4CYdd2',
    name: 'Crystiano Bayu Satya Alves',
    role: 'ASSISTANT',
    identifier: 'AST-02',
  },
  {
    id: 'iUuzqYziLZhWndnZdh9bx4NRsSe2',
    name: 'Herman',
    role: 'ASSISTANT',
    identifier: 'AST-03',
  },
  // Praktikan (Sesuai docs/DAFTAR_AKUN_TESTING.md)
  {
    id: 'mDZOvU3OiKUl037f9C1DuX5O6IH3',
    name: 'Bahir Ananda Wibowo',
    role: 'STUDENT',
    identifier: '24060124140184',
    enrolledClasses: ['A1', 'B2', 'C1'],
  },
  {
    id: 'JptPsdlcQPeUg9tVahmaaJGFcR23',
    name: 'Ahmad Dahlan',
    role: 'STUDENT',
    identifier: '24060124140101',
    enrolledClasses: ['A1', 'C1'],
  },
  {
    id: 'MMu4kWP6WKaAhKvSDDiCJ5Jjhxw1',
    name: 'Siti Nurhaliza',
    role: 'STUDENT',
    identifier: '24060124140102',
    enrolledClasses: ['B2', 'C1'],
  },
  {
    id: 'wgxCVH0QxiZ7VsEYPQprqW6KKAJ3',
    name: 'Jeedan',
    role: 'STUDENT',
    identifier: '24060124130102',
    enrolledClasses: ['A1', 'B2', 'C1'],
  },
];

export const MOCK_SESSIONS: PracticalSession[] = [
  {
    id: 'session-1',
    classId: 'class-c1',
    courseName: 'Pemrograman Perangkat Keras',
    classCode: 'C1',
    room: 'Lab C',
    timeSlot: '08.00 - 10.00 WIB',
    date: '2026-11-22',
    status: 'NOT_STARTED',
    assistantId: 'SxbmMvFvLcRUPSEhOiyJRfNpOzg1',
    assistantName: 'Muhammad Zaidan Alfarizi, Crystiano Bayu Satya Alves',
    totalStudents: 30,
  },
  {
    id: 'session-2',
    classId: 'class-b2',
    courseName: 'Struktur Data & Algoritma',
    classCode: 'B2',
    room: 'Lab B',
    timeSlot: '13.00 - 15.00 WIB',
    date: '2026-11-22',
    status: 'NOT_STARTED',
    assistantId: 'SxbmMvFvLcRUPSEhOiyJRfNpOzg1',
    assistantName: 'Muhammad Zaidan Alfarizi, Herman',
    totalStudents: 32,
  },
  {
    id: 'session-3',
    classId: 'class-a1',
    courseName: 'Basis Data Lanjut',
    classCode: 'A1',
    room: 'Lab D',
    timeSlot: '10.00 - 12.00 WIB',
    date: '2026-11-21',
    status: 'CLOSED',
    assistantId: 'EW1rsd5cTZR6iW0xDQdchJ4CYdd2',
    assistantName: 'Crystiano Bayu Satya Alves, Herman',
    totalStudents: 28,
  },
];

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'attendance_session-3_mDZOvU3OiKUl037f9C1DuX5O6IH3',
    sessionId: 'session-3',
    studentId: 'mDZOvU3OiKUl037f9C1DuX5O6IH3',
    studentName: 'Bahir Ananda Wibowo',
    studentNim: '24060124140184',
    timestamp: '2026-11-21T03:05:00.000Z',
    notes: 'Hadir praktikum Basis Data Lanjut',
  },
];
