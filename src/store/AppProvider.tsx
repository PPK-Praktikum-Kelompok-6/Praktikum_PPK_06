import React, { createContext, useReducer } from 'react';

import {
  MOCK_ATTENDANCE_RECORDS,
  MOCK_SESSIONS,
  MOCK_USERS,
} from '@/data/mockData';
import {
  AttendanceRecord,
  CreateSessionInput,
  PracticalSession,
  UserProfile,
} from '@/types/attendance';
import { appReducer, AppState } from './reducer';
import { canAttend, canClose, canOpen, isAlreadyAttended as checkAttended } from './rules';

export { CreateSessionInput };

export interface AppStoreContextType {
  currentUser: UserProfile;
  availableUsers: UserProfile[];
  setCurrentUser: (user: UserProfile) => void;
  sessions: PracticalSession[];
  attendanceRecords: AttendanceRecord[];
  openSession: (sessionId: string) => boolean;
  closeSession: (sessionId: string) => boolean;
  addSession: (
    input: CreateSessionInput
  ) => { success: boolean; message: string; session?: PracticalSession };
  submitAttendance: (
    sessionId: string,
    student: UserProfile,
    notes?: string
  ) => { success: boolean; message: string };
  isAlreadyAttended: (sessionId: string, studentId: string) => boolean;
  getSessionById: (sessionId: string) => PracticalSession | undefined;
  getAttendanceBySession: (sessionId: string) => AttendanceRecord[];
  getAttendanceByStudent: (
    studentId: string
  ) => (AttendanceRecord & { session?: PracticalSession })[];
}

export const AppStoreContext = createContext<AppStoreContextType | null>(null);

const initialState: AppState = {
  currentUser: MOCK_USERS[0], // Default: Muhammad Zaidan Alfarizi (ASSISTANT)
  sessions: MOCK_SESSIONS,
  attendanceRecords: MOCK_ATTENDANCE_RECORDS,
};

export interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setCurrentUser = (user: UserProfile) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  };

  const getSessionById = (sessionId: string): PracticalSession | undefined => {
    return state.sessions.find((s) => s.id === sessionId);
  };

  const openSession = (sessionId: string): boolean => {
    const session = getSessionById(sessionId);
    const rule = canOpen(session, state.currentUser.role);
    if (!rule.allowed) {
      return false;
    }
    dispatch({ type: 'OPEN_SESSION', payload: sessionId });
    return true;
  };

  const closeSession = (sessionId: string): boolean => {
    const session = getSessionById(sessionId);
    const rule = canClose(session, state.currentUser.role);
    if (!rule.allowed) {
      return false;
    }
    dispatch({ type: 'CLOSE_SESSION', payload: sessionId });
    return true;
  };

  const isAlreadyAttended = (sessionId: string, studentId: string): boolean => {
    return checkAttended(state.attendanceRecords, sessionId, studentId);
  };

  const submitAttendance = (
    sessionId: string,
    student: UserProfile,
    notes?: string
  ): { success: boolean; message: string } => {
    const session = getSessionById(sessionId);
    const rule = canAttend(session, state.attendanceRecords, student.id);
    if (!rule.allowed) {
      return {
        success: false,
        message: rule.reason || 'Gagal melakukan presensi.',
      };
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      sessionId,
      studentId: student.id,
      studentName: student.name,
      studentNim: student.identifier,
      timestamp: new Date().toISOString(),
      notes,
    };

    dispatch({ type: 'SUBMIT_ATTENDANCE', payload: newRecord });
    return {
      success: true,
      message: 'Presensi berhasil dicatat!',
    };
  };

  const addSession = (
    input: CreateSessionInput
  ): { success: boolean; message: string; session?: PracticalSession } => {
    if (state.currentUser.role !== 'ASSISTANT') {
      return {
        success: false,
        message: 'Hanya asisten yang memiliki wewenang untuk menambahkan sesi praktikum.',
      };
    }

    if (!input.courseName.trim()) {
      return { success: false, message: 'Nama mata kuliah wajib diisi.' };
    }
    if (!input.room.trim()) {
      return { success: false, message: 'Ruangan Lab wajib diisi.' };
    }
    if (!input.startTime.trim() || !input.endTime.trim()) {
      return { success: false, message: 'Waktu mulai dan selesai praktikum wajib diisi.' };
    }

    const newSession: PracticalSession = {
      id: `session-${Date.now()}`,
      courseName: input.courseName.trim(),
      classCode: (input.classCode || 'A1').trim(),
      room: input.room.trim(),
      timeSlot: `${input.startTime.trim()} - ${input.endTime.trim()} WIB`,
      date: new Date().toISOString(),
      status: 'NOT_STARTED',
      assistantId: state.currentUser.id,
      assistantName: state.currentUser.name,
      totalStudents: input.totalStudents ?? 30,
      description: input.description?.trim() || undefined,
    };

    dispatch({ type: 'ADD_SESSION', payload: newSession });
    return {
      success: true,
      message: 'Sesi praktikum berhasil ditambahkan dan siap dimulai!',
      session: newSession,
    };
  };

  const getAttendanceBySession = (sessionId: string): AttendanceRecord[] => {
    return state.attendanceRecords.filter((rec) => rec.sessionId === sessionId);
  };

  const getAttendanceByStudent = (
    studentId: string
  ): (AttendanceRecord & { session?: PracticalSession })[] => {
    return state.attendanceRecords
      .filter((rec) => rec.studentId === studentId)
      .map((rec) => ({
        ...rec,
        session: state.sessions.find((s) => s.id === rec.sessionId),
      }));
  };

  const contextValue: AppStoreContextType = {
    currentUser: state.currentUser,
    availableUsers: MOCK_USERS,
    setCurrentUser,
    sessions: state.sessions,
    attendanceRecords: state.attendanceRecords,
    openSession,
    closeSession,
    addSession,
    submitAttendance,
    isAlreadyAttended,
    getSessionById,
    getAttendanceBySession,
    getAttendanceByStudent,
  };

  return (
    <AppStoreContext.Provider value={contextValue}>
      {children}
    </AppStoreContext.Provider>
  );
}
