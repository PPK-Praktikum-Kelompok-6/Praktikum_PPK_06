export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LabLocation {
  id: string; // misal: "lab-komputer-1", "lab-komputer-2", "lab-basis-data"
  name: string; // harus cocok dengan field `room` di PracticalSession, misal: "Lab Komputer 2"
  building: string; // misal: "Gedung E Departemen Informatika"
  latitude: number;
  longitude: number;
  radiusMeters: number; // default misal: 50 (meter)
  updatedBy?: string;
  updatedAt?: string;
}

export type LocationCheckStatus =
  | 'IDLE'
  | 'CHECKING'
  | 'INSIDE_RADIUS'
  | 'OUTSIDE_RADIUS'
  | 'PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'UNAVAILABLE';

export interface LocationValidationResult {
  allowed: boolean;
  status: LocationCheckStatus;
  distanceMeters: number | null;
  maxRadiusMeters: number;
  userCoords?: Coordinates;
  message: string;
}
