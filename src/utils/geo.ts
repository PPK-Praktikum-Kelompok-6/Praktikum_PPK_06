import { Coordinates, LabLocation, LocationValidationResult } from '@/types/lab';

const EARTH_RADIUS_METERS = 6371000;

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
