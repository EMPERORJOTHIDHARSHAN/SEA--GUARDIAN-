import { Coordinates, AlertLevel, AlertState } from '../types/marine';
import { IMBL_COORDINATES } from '../data/imblData';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const dLat = toRad(coord2.lat - coord1.lat);
  const dLon = toRad(coord2.lng - coord1.lng);
  const lat1 = toRad(coord1.lat);
  const lat2 = toRad(coord2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Calculates initial bearing (0-359°) from start to destination
 */
export function calculateBearing(start: Coordinates, dest: Coordinates): number {
  const lat1 = toRad(start.lat);
  const lat2 = toRad(dest.lat);
  const dLon = toRad(dest.lng - start.lng);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = toDeg(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;
  return Math.round(bearing);
}

/**
 * Convert bearing to 16-point cardinal compass text in English and Tamil
 */
export function bearingToCardinal(bearing: number): { en: string; ta: string } {
  const directions = [
    { en: 'North (N)', ta: 'வடக்கு (N)' },
    { en: 'North-Northeast (NNE)', ta: 'வட-வடகிழக்கு' },
    { en: 'Northeast (NE)', ta: 'வடகிழக்கு (NE)' },
    { en: 'East-Northeast (ENE)', ta: 'கிழக்கு-வடகிழக்கு' },
    { en: 'East (E)', ta: 'கிழக்கு (E)' },
    { en: 'East-Southeast (ESE)', ta: 'கிழக்கு-தென்கிழக்கு' },
    { en: 'Southeast (SE)', ta: 'தென்கிழக்கு (SE)' },
    { en: 'South-Southeast (SSE)', ta: 'தென்-தென்கிழக்கு' },
    { en: 'South (S)', ta: 'தெற்கு (S)' },
    { en: 'South-Southwest (SSW)', ta: 'தென்-தென்மேற்கு' },
    { en: 'Southwest (SW)', ta: 'தென்மேற்கு (SW)' },
    { en: 'West-Southwest (WSW)', ta: 'மேற்கு-தென்மேற்கு (WSW)' },
    { en: 'West (W)', ta: 'மேற்கு (W)' },
    { en: 'West-Northwest (WNW)', ta: 'மேற்கு-வடமேற்கு' },
    { en: 'Northwest (NW)', ta: 'வடமேற்கு (NW)' },
    { en: 'North-Northwest (NNW)', ta: 'வட-வடமேற்கு' },
  ];

  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
}

/**
 * Finds the closest point on a line segment [p1, p2] to a point p
 */
function getClosestPointOnSegment(
  p: Coordinates,
  p1: Coordinates,
  p2: Coordinates
): { point: Coordinates; t: number } {
  const x = p.lng;
  const y = p.lat;
  const x1 = p1.lng;
  const y1 = p1.lat;
  const x2 = p2.lng;
  const y2 = p2.lat;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { point: { lat: y1, lng: x1 }, t: 0 };
  }

  // Projection parameter t
  let t = ((x - x1) * dx + (y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    point: {
      lat: y1 + t * dy,
      lng: x1 + t * dx,
    },
    t,
  };
}

/**
 * Checks whether the point is on the Sri Lankan (eastern/foreign) side of the IMBL segment.
 * IMBL points in our array are ordered North to South.
 * For a segment from A (North) to B (South):
 * Vector AB = (B.lng - A.lng, B.lat - A.lat)
 * Looking along vector AB (Southbound):
 * West (India) is to the RIGHT (cross product < 0).
 * East (Sri Lanka) is to the LEFT (cross product > 0).
 */
function isPointOnSriLankaSide(
  p: Coordinates,
  p1: Coordinates,
  p2: Coordinates
): boolean {
  // Cross product of (p2 - p1) x (p - p1)
  const cross = (p2.lng - p1.lng) * (p.lat - p1.lat) - (p2.lat - p1.lat) * (p.lng - p1.lng);
  // In latitude/longitude where lat is y and lng is x:
  // p2 is south of p1 (lat decreases, dy < 0)
  // If boat is to the East (higher lng), it has entered Sri Lankan waters
  return cross > 0;
}

/**
 * Evaluates the boat's position against the IMBL line
 * Returns complete alert state with buffer tiers:
 * - > 2000m: SAFE (Green)
 * - 1000m - 2000m: YELLOW (Warning at 2 km)
 * - 500m - 1000m: ORANGE (Alert at 1 km)
 * - 0m - 500m: RED (Critical at 500 m)
 * - Crossed: BREACH (Crossed boundary / International waters)
 */
export function evaluateBoatAlert(boatPos: Coordinates): AlertState {
  let minDistanceMeters = Infinity;
  let closestPoint: Coordinates = { lat: 0, lng: 0 };
  let isBreached = false;
  let closestSegmentIdx = 0;

  for (let i = 0; i < IMBL_COORDINATES.length - 1; i++) {
    const p1 = IMBL_COORDINATES[i];
    const p2 = IMBL_COORDINATES[i + 1];

    const { point } = getClosestPointOnSegment(boatPos, p1, p2);
    const dist = calculateHaversineDistance(boatPos, point);

    if (dist < minDistanceMeters) {
      minDistanceMeters = dist;
      closestPoint = point;
      closestSegmentIdx = i;
      isBreached = isPointOnSriLankaSide(boatPos, p1, p2);
    }
  }

  // Calculate safe return vector:
  // We want to point the boat away from the boundary back into Indian waters.
  // We offset the closest border point roughly 2.5 km perpendicular towards the Indian (West/South-West) side.
  const bearingToBorder = calculateBearing(boatPos, closestPoint);
  
  // Safe return bearing:
  let safeReturnBearing: number;
  let safeReturnDistanceMeters: number;

  if (isBreached) {
    // If already breached, head back towards the border plus a 1.5 km safety margin inside India
    const bearingBackToBorder = calculateBearing(boatPos, closestPoint);
    // Continue heading roughly West/South-West (towards Rameswaram/Dhanushkodi)
    safeReturnBearing = bearingBackToBorder;
    safeReturnDistanceMeters = minDistanceMeters + 1500;
  } else {
    // If not breached, safe direction is roughly 180° away from the border, or towards Rameswaram/Mandapam
    safeReturnBearing = (bearingToBorder + 180) % 360;
    // Turn back inside Indian waters
    safeReturnDistanceMeters = 2000;
  }

  const cardinal = bearingToCardinal(safeReturnBearing);

  // Determine Alert Level based on user specification:
  // Yellow at 2 km
  // Orange at 1 km
  // Red at 500 m
  // If crossed boundary: Loud buzzer alarm + Voice warning
  let level: AlertLevel = 'SAFE';
  let messageEn = 'Indian Territorial Waters. Normal Operations.';
  let messageTa = 'இந்திய கடல் எல்லைக்குள் பாதுகாப்பாக உள்ளீர்கள்.';

  if (isBreached) {
    level = 'BREACH';
    messageEn = `CRITICAL BREACH! You crossed the International Maritime Boundary Line by ${(minDistanceMeters / 1000).toFixed(2)} km! Turn ${cardinal.en} immediately to return to Indian waters!`;
    messageTa = `எல்லை மீறல்! நீங்கள் சர்வதேச கடல் எல்லையை கடந்துவிட்டீர்கள்! உடனடியாக ${cardinal.ta} திசையில் திரும்புங்கள்!`;
  } else if (minDistanceMeters <= 500) {
    level = 'RED';
    messageEn = `RED ALERT! Boundary is just ${(minDistanceMeters).toFixed(0)}m away! Turn ${cardinal.en} immediately!`;
    messageTa = `அபாயம்! எல்லை ${(minDistanceMeters).toFixed(0)} மீட்டருக்குள் உள்ளது. உடனடியாக ${cardinal.ta} திசையில் திரும்புங்கள்!`;
  } else if (minDistanceMeters <= 1000) {
    level = 'ORANGE';
    messageEn = `ORANGE ALERT! 1 km Boundary Buffer Reached (${(minDistanceMeters).toFixed(0)}m). Prepare to steer ${cardinal.en}.`;
    messageTa = `ஆரஞ்சு எச்சரிக்கை! எல்லை 1 கி.மீ தொலைவில் உள்ளது (${(minDistanceMeters).toFixed(0)} மீ). ${cardinal.ta} திசையில் திரும்பவும்.`;
  } else if (minDistanceMeters <= 2000) {
    level = 'YELLOW';
    messageEn = `YELLOW ALERT! Approaching 2 km Maritime Boundary Zone (${(minDistanceMeters / 1000).toFixed(2)} km).`;
    messageTa = `எச்சரிக்கை! நீங்கள் சர்வதேச கடல் எல்லையை நெருங்குகிறீர்கள் (${(minDistanceMeters / 1000).toFixed(1)} கி.மீ).`;
  }

  return {
    level,
    distanceMeters: Math.round(minDistanceMeters),
    closestPoint,
    safeReturnBearing,
    safeReturnDistanceMeters: Math.round(safeReturnDistanceMeters),
    safeReturnDirectionEn: cardinal.en,
    safeReturnDirectionTa: cardinal.ta,
    messageEn,
    messageTa,
    timestamp: new Date().toLocaleTimeString(),
    isAudioActive: level !== 'SAFE',
  };
}

/**
 * Projects a new coordinate given start point, bearing, and distance (meters)
 */
export function projectCoordinate(
  start: Coordinates,
  bearingDeg: number,
  distMeters: number
): Coordinates {
  const d = distMeters / EARTH_RADIUS_METERS;
  const brng = toRad(bearingDeg);
  const lat1 = toRad(start.lat);
  const lon1 = toRad(start.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
      Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );

  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return {
    lat: toDeg(lat2),
    lng: toDeg(lon2),
  };
}

export interface OceanValidationResult {
  isValidWater: boolean;
  lat: number;
  lng: number;
  isClamped: boolean;
  reason?: string;
}

/**
 * Validates whether a geographic point is in navigable marine waters.
 * Prevents vessels from running onto mainland Tamil Nadu or Sri Lanka.
 * If a point is on land, clamps it to the nearest safe seaward ocean coordinates.
 */
export function validateOceanPosition(lat: number, lng: number): OceanValidationResult {
  let isLand = false;
  let reason = '';
  let safeLat = lat;
  let safeLng = lng;

  // 1. TAMIL NADU MAINLAND COASTLINE CHECKS
  // Sector A: Nagapattinam / Karaikal / Nagore / Boothangudy (lat >= 10.3)
  if (lat >= 10.3) {
    // Coastline of Coromandel Coast / Nagore is approximately at lng 79.855.
    // Anything west of lng 79.865 is inland (Boothangudy, Nagore, NH32, agricultural fields)
    const minOceanLng = 79.868;
    if (lng < minOceanLng) {
      isLand = true;
      reason = 'Mainland Tamil Nadu (Nagore/Nagapattinam inland sector)';
      safeLng = minOceanLng + 0.015; // 1.5 km seaward into Bay of Bengal
    }
  }
  // Sector B: Point Calimere to Manamelkudi (lat between 9.85 and 10.3)
  else if (lat >= 9.85 && lat < 10.3) {
    // Coastline slopes from Point Calimere (79.85) to Manamelkudi (79.25)
    const t = (lat - 9.85) / (10.3 - 9.85);
    const coastLng = 79.25 + t * (79.85 - 79.25);
    if (lng < coastLng + 0.01) {
      isLand = true;
      reason = 'Tamil Nadu Coast (Palk Strait mainland)';
      safeLng = coastLng + 0.02; // seaward into Palk Strait
    }
  }
  // Sector C: Palk Bay (lat between 9.35 and 9.85)
  else if (lat >= 9.35 && lat < 9.85) {
    const minOceanLng = 79.14;
    if (lng < minOceanLng) {
      isLand = true;
      reason = 'Mainland Tamil Nadu (Palk Bay west shore)';
      safeLng = minOceanLng + 0.02;
    }
  }
  // Sector D: Mandapam & Rameswaram Island Channel (lat between 9.18 and 9.35)
  else if (lat >= 9.18 && lat < 9.35) {
    // West of Mandapam pass (lng < 79.11) is mainland Ramanathapuram
    if (lng < 79.11) {
      isLand = true;
      reason = 'Mainland Tamil Nadu (Mandapam/Ramanathapuram)';
      safeLng = 79.13;
    }
    // Rameswaram Island interior (lat: 9.27 to 9.31, lng: 79.24 to 79.33)
    if (lat >= 9.27 && lat <= 9.31 && lng >= 79.24 && lng <= 79.33) {
      isLand = true;
      reason = 'Rameswaram Island landmass';
      safeLat = 9.325; // into Palk Bay waters
      safeLng = lng;
    }
  }
  // Sector E: Gulf of Mannar (lat < 9.18)
  else if (lat < 9.18) {
    const minOceanLng = 78.92;
    if (lng < minOceanLng) {
      isLand = true;
      reason = 'Mainland Tamil Nadu (Gulf of Mannar coast)';
      safeLng = minOceanLng + 0.02;
    }
  }

  // 2. SRI LANKA LANDMASS CHECKS
  // Jaffna Peninsula (lat 9.55 to 9.85, lng > 79.80)
  if (lat >= 9.55 && lat <= 9.85 && lng > 79.80) {
    isLand = true;
    reason = 'Sri Lanka (Jaffna Peninsula)';
    safeLng = 79.78;
  }
  // Mannar Island (lat 8.95 to 9.15, lng > 79.72)
  if (lat >= 8.95 && lat <= 9.15 && lng > 79.72) {
    isLand = true;
    reason = 'Sri Lanka (Mannar Island)';
    safeLng = 79.69;
  }
  // Sri Lanka Mainland South of Mannar (lat < 8.95, lng > 79.85)
  if (lat < 8.95 && lng > 79.85) {
    isLand = true;
    reason = 'Sri Lanka Mainland (North-Western coast)';
    safeLng = 79.82;
  }

  return {
    isValidWater: !isLand,
    lat: safeLat,
    lng: safeLng,
    isClamped: isLand,
    reason,
  };
}
