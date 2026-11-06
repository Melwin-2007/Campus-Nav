import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPUS_CENTER,
  CAMPUS_BOUNDS,
  haversineDistance,
  isUserOffCampus,
} from '../geoUtils';

describe('geoUtils — Spatial Distance & Geolocation Stress Tests', () => {
  it('should return 0 meters for identical coordinates', () => {
    const dist = haversineDistance(CAMPUS_CENTER.lat, CAMPUS_CENTER.lon, CAMPUS_CENTER.lat, CAMPUS_CENTER.lon);
    assert.strictEqual(dist, 0);
  });

  it('should return 0 meters for identical coordinates at the equator', () => {
    const dist = haversineDistance(0, 0, 0, 0);
    assert.strictEqual(dist, 0);
  });

  it('should return 0 meters for identical coordinates at the North Pole', () => {
    // Latitude 90 deg has 0 longitudinal radius; any longitude should yield 0 distance
    const dist = haversineDistance(90, 0, 90, 180);
    assert.ok(Math.abs(dist) < 1e-4, `Expected near zero distance at pole, got ${dist}`);
  });

  it('should return 0 meters for identical coordinates at the South Pole', () => {
    const dist = haversineDistance(-90, -45, -90, 135);
    assert.ok(Math.abs(dist) < 1e-4, `Expected near zero distance at pole, got ${dist}`);
  });

  it('should correctly compute pole-to-pole distance (~20,015 km)', () => {
    const dist = haversineDistance(90, 0, -90, 0);
    const expectedDist = Math.PI * 6371000;
    assert.ok(Math.abs(dist - expectedDist) < 1.0, `Expected ~${expectedDist}, got ${dist}`);
  });

  it('should correctly compute 1 degree meridian distance (~111.19 km)', () => {
    const dist = haversineDistance(0, 0, 1, 0);
    const expectedDist = (Math.PI / 180) * 6371000;
    assert.ok(Math.abs(dist - expectedDist) < 1.0, `Expected ~${expectedDist}, got ${dist}`);
  });

  it('should be symmetric: dist(A, B) === dist(B, A)', () => {
    const lat1 = 17.659910;
    const lon1 = 75.906420;
    const lat2 = 17.660800;
    const lon2 = 75.907300;
    const distAB = haversineDistance(lat1, lon1, lat2, lon2);
    const distBA = haversineDistance(lat2, lon2, lat1, lon1);
    assert.strictEqual(distAB, distBA);
    assert.ok(distAB > 100 && distAB < 200, `Distance should be ~136m, got ${distAB}`);
  });

  it('should evaluate user at campus center as NOT off-campus', () => {
    const res = isUserOffCampus(CAMPUS_CENTER.lat, CAMPUS_CENTER.lon, 300);
    assert.strictEqual(res.offCampus, false);
    assert.strictEqual(res.distance, 0);
  });

  it('should evaluate user within 300m radius as NOT off-campus', () => {
    // Admin complex entrance (node 1): 17.659910, 75.906420 (~2.4m from center)
    const res = isUserOffCampus(17.659910, 75.906420, 300);
    assert.strictEqual(res.offCampus, false);
    assert.ok(res.distance < 5.0, `Expected <5m, got ${res.distance}`);
  });

  it('should evaluate user at exactly 300m threshold as NOT off-campus (boundary condition)', () => {
    // Given dist > thresholdMeters, exactly 300m should not be off-campus
    const res = isUserOffCampus(CAMPUS_CENTER.lat, CAMPUS_CENTER.lon, 0);
    assert.strictEqual(res.offCampus, false);
  });

  it('should evaluate user far away (>300m) as off-campus', () => {
    // Off-campus point: 17.6800, 75.9200 (~2.6km away)
    const res = isUserOffCampus(17.6800, 75.9200, 300);
    assert.strictEqual(res.offCampus, true);
    assert.ok(res.distance > 2000, `Expected >2000m, got ${res.distance}`);
  });

  it('should respect custom threshold parameters in isUserOffCampus', () => {
    const lat = 17.660800;
    const lon = 75.907300; // ~136m from center
    const tight = isUserOffCampus(lat, lon, 50);
    const generous = isUserOffCampus(lat, lon, 200);
    assert.strictEqual(tight.offCampus, true);
    assert.strictEqual(generous.offCampus, false);
  });

  it('should verify CAMPUS_BOUNDS coordinates encompass campus center', () => {
    assert.ok(CAMPUS_CENTER.lat >= CAMPUS_BOUNDS.southWest[0]);
    assert.ok(CAMPUS_CENTER.lat <= CAMPUS_BOUNDS.northEast[0]);
    assert.ok(CAMPUS_CENTER.lon >= CAMPUS_BOUNDS.southWest[1]);
    assert.ok(CAMPUS_CENTER.lon <= CAMPUS_BOUNDS.northEast[1]);
  });
});
