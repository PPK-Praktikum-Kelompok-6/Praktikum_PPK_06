import {
  AttendanceRecord,
  PracticalSession,
  UserProfile,
} from '@/types/attendance';

export interface AppState {
  currentUser: UserProfile;
  sessions: PracticalSession[];
  attendanceRecords: AttendanceRecord[];
}

export type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: UserProfile }
  | { type: 'OPEN_SESSION'; payload: string }
  | { type: 'CLOSE_SESSION'; payload: string }
  | { type: 'SUBMIT_ATTENDANCE'; payload: AttendanceRecord };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return {
        ...state,
        currentUser: action.payload,
      };

    case 'OPEN_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.payload
            ? { ...session, status: 'OPEN' }
            : session
        ),
      };

    case 'CLOSE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.payload
            ? { ...session, status: 'CLOSED' }
            : session
        ),
      };

    case 'SUBMIT_ATTENDANCE':
      return {
        ...state,
        attendanceRecords: [action.payload, ...state.attendanceRecords],
      };

    default:
      return state;
  }
}
