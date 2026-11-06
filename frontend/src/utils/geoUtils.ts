/**
 * Geographic calculation utilities for Campus Navigator.
 */

export const CAMPUS_CENTER = {
  lat: 17.6599,
  lon: 75.9064,
  zoom: 16,
};

export const CAMPUS_BOUNDS = {
  southWest: [17.655, 75.901] as [number, number],
  northEast: [17.666, 75.912] as [number, number],
};

/**
 * Calculates great-circle distance between two points in meters using Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a user's coordinates are off-campus (> threshold meters from campus perimeter/center).
 */
export function isUserOffCampus(
  userLat: number,
  userLon: number,
  thresholdMeters: number = 300
): { offCampus: boolean; distance: number } {
  const dist = haversineDistance(userLat, userLon, CAMPUS_CENTER.lat, CAMPUS_CENTER.lon);
  return {
    offCampus: dist > thresholdMeters,
    distance: dist,
  };
}
