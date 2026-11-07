/**
 * Geographic calculation utilities for Campus Navigator.
 */

export const CAMPUS_CENTER = {
  lat: 15.880562,
  lon: 74.519312,
  zoom: 17,
};

export const CAMPUS_BOUNDS = {
  southWest: [15.875, 74.513] as [number, number],
  northEast: [15.886, 74.526] as [number, number],
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
  if (
    typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
    Number.isNaN(lat1) || Number.isNaN(lon1) ||
    Number.isNaN(lat2) || Number.isNaN(lon2)
  ) {
    return NaN;
  }

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
  if (
    typeof userLat !== 'number' || typeof userLon !== 'number' ||
    Number.isNaN(userLat) || Number.isNaN(userLon)
  ) {
    return {
      offCampus: true,
      distance: Infinity,
    };
  }

  const dist = haversineDistance(userLat, userLon, CAMPUS_CENTER.lat, CAMPUS_CENTER.lon);
  return {
    offCampus: dist > thresholdMeters,
    distance: dist,
  };
}
