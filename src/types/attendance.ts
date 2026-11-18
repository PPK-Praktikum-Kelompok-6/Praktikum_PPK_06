export type SessionStatus = 'NOT_STARTED' | 'OPEN' | 'CLOSED';
export type UserRole = 'ADMIN' | 'ASSISTANT' | 'STUDENT';
export type ApprovalStatus =
  | 'PENDING_ADMIN'
  | 'PENDING_ASSISTANT'
  | 'APPROVED'
  | 'REJECTED';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  identifier: string; // NIM, Kode Asisten, atau Kode Admin ("AST-01", "24060124130102", "ADM-01")
  enrolledClasses?: string[];
  approvalStatus?: ApprovalStatus;
  requestedClass?: string;
  email?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  studentNim: string;
  timestamp: string; // ISO string format
  notes?: string;
}

export interface PracticalSession {
  id: string;
  courseName: string;
  classCode: string;
  room: string;
  timeSlot: string;
  date: string;
  status: SessionStatus;
  assistantId: string;
  assistantName: string;
  totalStudents: number;
  description?: string;
  createdAt?: string;
  pendingChangeRequest?: 'DELETE' | 'RESCHEDULE';
}

export interface CreateSessionInput {
  courseName: string;
  classCode?: string;
  room: string;
  startTime: string;
  endTime: string;
  description?: string;
  totalStudents?: number;
}

export interface SessionChangeRequest {
  id: string;
  sessionId: string;
  courseName: string;
  classCode: string;
  type: 'DELETE' | 'RESCHEDULE';
  requestedBy: string;
  requestedByName: string;
  reason: string;
  newTimeSlot?: string;
  newDate?: string;
  newRoom?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNote?: string;
}

export interface PracticalClass {
  id: string;
  classCode: string; // 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1' | 'D2'
  courseName?: string;
  room?: string;
  assistantId: string;
  assistantName: string;
  studentIds: string[];
  isOpen?: boolean; // Dikendalikan oleh admin untuk membuka/menutup ketersediaan kelas
}
