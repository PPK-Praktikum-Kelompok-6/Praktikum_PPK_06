import { Coordinates, LabLocation, LocationValidationResult } from '@/types/lab';

const EARTH_RADIUS_METERS = 6371000;

const LEGACY_ROOM_TO_NEW_LAB: Record<string, string> = {
  'lab basis data': 'Lab D',
  'lab-basis-data': 'Lab D',
  'lab komputer 2': 'Lab C',
  'lab-komputer-2': 'Lab C',
  'lab komputer 1': 'Lab B',
  'lab-komputer-1': 'Lab B',
  'lab komputer': 'Lab B',
  'lab jaringan': 'Lab AP',
  'lab-jaringan': 'Lab AP',
  'lab riset & kecerdasan buatan': 'Lab AP',
  'lab riset': 'Lab AP',
  'lab-riset-ai': 'Lab AP',
};

/**
 * Menormalkan nama ruangan praktikum lama ke 4 laboratorium resmi (Lab D, Lab C, Lab B, Lab AP).
 */
export function normalizeLabRoomName(room: string | undefined | null): string {
  const trimmed = (room || '').trim();
  if (!trimmed) return '';
  const mapped = LEGACY_ROOM_TO_NEW_LAB[trimmed.toLowerCase()];
  return mapped || trimmed;
}

/**
 * Memeriksa kecocokan nama ruangan sesi dengan objek laboratorium secara presisi.
 */
export function isRoomMatchingLab(
  room: string | undefined | null,
  lab: Pick<LabLocation, 'id' | 'name'>,
  sessionLabId?: string
): boolean {
  if (sessionLabId && sessionLabId.trim().toLowerCase() === lab.id.trim().toLowerCase()) {
    return true;
  }
  const normalizedRoom = normalizeLabRoomName(room).toLowerCase();
  if (!normalizedRoom) return false;

  const labNameNorm = (lab.name || '').trim().toLowerCase();
  const labIdNorm = (lab.id || '').trim().toLowerCase();

  return normalizedRoom === labNameNorm || normalizedRoom === labIdNorm;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak antara dua titik koordinat (dalam meter) menggunakan rumus Haversine.
 */
export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Memvalidasi apakah posisi praktikan berada di dalam radius laboratorium yang diizinkan.
 */
export function validateStudentLocation(
  userCoords: Coordinates | null,
  lab: Pick<LabLocation, 'latitude' | 'longitude' | 'radiusMeters' | 'name'>
): LocationValidationResult {
  if (!userCoords) {
    return {
      allowed: false,
      status: 'UNAVAILABLE',
      distanceMeters: null,
      maxRadiusMeters: lab.radiusMeters,
      message: 'Lokasi perangkat belum tersedia. Pastikan GPS aktif dan izin lokasi diberikan.',
    };
  }

  const distanceMeters = calculateDistanceMeters(userCoords, {
    latitude: lab.latitude,
    longitude: lab.longitude,
  });

  const allowed = distanceMeters <= lab.radiusMeters;

  return {
    allowed,
    status: allowed ? 'INSIDE_RADIUS' : 'OUTSIDE_RADIUS',
    distanceMeters,
    maxRadiusMeters: lab.radiusMeters,
    userCoords,
    message: allowed
      ? `Anda berada di dalam area ${lab.name} (${distanceMeters} m dari titik pusat, batas radius ${lab.radiusMeters} m).`
      : `Anda berada di luar area ${lab.name} (Jarak: ${distanceMeters} m, batas radius: ${lab.radiusMeters} m).`,
  };
}
