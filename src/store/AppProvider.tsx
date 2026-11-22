import React, { createContext, useEffect, useReducer } from 'react';

import {
  MOCK_ATTENDANCE_RECORDS,
  MOCK_SESSIONS,
  MOCK_USERS,
} from '@/data/mockData';
import { onAuthChange } from '@/services/auth';
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

const GUEST_USER: UserProfile = {
  id: '',
  name: 'Tamu',
  role: 'STUDENT',
  identifier: '-',
};

const initialState: AppState = {
  currentUser: GUEST_USER,
  sessions: MOCK_SESSIONS,
  attendanceRecords: MOCK_ATTENDANCE_RECORDS,
};

export interface AppProviderProps {
  children: React.ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Sinkronisasi otomatis pengguna yang aktif dari Firebase Auth
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      if (user) {
        dispatch({
          type: 'SET_CURRENT_USER',
          payload: {
            id: user.uid,
            name: user.name,
            role: user.role,
            identifier: user.identifier,
            enrolledClasses: user.enrolledClasses,
            approvalStatus: user.approvalStatus,
          },
        });
      } else {
        dispatch({ type: 'SET_CURRENT_USER', payload: GUEST_USER });
      }
    });
    return () => unsub();
  }, []);

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
      date: input.date || new Date().toISOString().split('T')[0],
      status: 'NOT_STARTED',
      assistantId: state.currentUser.id,
      assistantName: state.currentUser.name,
      totalStudents: input.totalStudents ?? 30,
      deliveryMode: input.deliveryMode || 'OFFLINE',
      meetingLink: input.meetingLink?.trim() || undefined,
      description: input.description?.trim() || undefined,
      createdAt: new Date().toISOString(),
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
