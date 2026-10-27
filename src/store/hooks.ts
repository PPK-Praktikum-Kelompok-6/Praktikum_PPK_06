import { useContext } from 'react';

import { AppStoreContext, AppStoreContextType } from './AppProvider';

function useStore(): AppStoreContextType {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error('Store hooks must be used within an <AppProvider>.');
  }
  return context;
}

/**
 * Hook untuk mengakses dan mengubah profil/role pengguna aktif saat ini.
 */
export function useCurrentUser() {
  const store = useStore();
  return {
    currentUser: store.currentUser,
    availableUsers: store.availableUsers,
    setCurrentUser: store.setCurrentUser,
  };
}

/**
 * Hook untuk mengakses jadwal sesi, detail sesi, dan kontrol buka/tutup sesi praktikum.
 */
export function useSessions() {
  const store = useStore();
  return {
    sessions: store.sessions,
    getSessionById: store.getSessionById,
    openSession: store.openSession,
    closeSession: store.closeSession,
  };
}

/**
 * Hook untuk presensi praktikan, pengecekan anti-double attendance, dan rekapitulasi kehadiran.
 */
export function useAttendance() {
  const store = useStore();
  return {
    attendanceRecords: store.attendanceRecords,
    submitAttendance: store.submitAttendance,
    isAlreadyAttended: store.isAlreadyAttended,
    getAttendanceBySession: store.getAttendanceBySession,
    getAttendanceByStudent: store.getAttendanceByStudent,
  };
}
