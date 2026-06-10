/**
 * Geo-Location Service
 * 
 * Provides GPS validation, geofencing, and spatial analysis using Turf.js.
 * Used to verify that construction site measurements were taken at the correct
 * location — critical for preventing fraudulent Nyxen entries.
 * 
 * Key capabilities:
 * 1. Point-in-polygon checks (is the GPS point within the parcel boundary?)
 * 2. Distance calculations (how far is the point from the boundary?)
 * 3. GPS spoofing detection (are the coordinates suspiciously perfect?)
 * 4. Reverse geocoding (approximate address from coordinates)
 * 5. Radius-based proximity checks
 */

import * as turf from '@turf/turf';

// ─── Types ────────────────────────────────────────────────────────

export interface ValidationResult {
  /** Whether the point is inside the boundary */
  isValid: boolean;
  /** Distance to nearest boundary edge in metres */
  distanceToBoundary: number;
  /** Human-readable validation message */
  message: string;
  /** Confidence in the validation (0-100) */
  confidence: number;
}

export interface SpoofingResult {
  /** Whether spoofing is suspected */
  isSuspicious: boolean;
  /** Risk level */
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  /** List of suspicious indicators found */
  indicators: string[];
  /** Overall spoofing risk score (0-100, higher = more suspicious) */
  score: number;
}

export interface ReverseGeocodeResult {
  /** Approximate address */
  address: string;
  /** City/town */
  city: string;
  /** State */
  state: string;
  /** Country */
  country: string;
  /** Approximate area name */
  area: string;
}

// ─── Coordinate Validation ────────────────────────────────────────

/**
 * Validate whether a GPS point falls within a parcel boundary polygon.
 * Uses Turf.js booleanPointInPolygon for accurate spatial analysis.
 * 
 * @param lat - Latitude of the point to check
 * @param lng - Longitude of the point to check
 * @param parcelBoundary - Array of [lat, lng] coordinates forming a closed polygon
 * @returns Validation result with distance information
 */
export function validateCoordinates(
  lat: number,
  lng: number,
  parcelBoundary: [number, number][]
): ValidationResult {
  if (!parcelBoundary || parcelBoundary.length < 4) {
    return {
      isValid: false,
      distanceToBoundary: -1,
      message: 'Invalid parcel boundary — insufficient coordinates',
      confidence: 0,
    };
  }

  try {
    // Create GeoJSON point (Turf uses [lng, lat] order per GeoJSON spec)
    const point = turf.point([lng, lat]);

    // Create polygon — Turf expects [lng, lat] coordinates
    const polygonCoords = parcelBoundary.map(([pLat, pLng]) => [pLng, pLat] as [number, number]);

    // Ensure the polygon is closed
    const first = polygonCoords[0];
    const last = polygonCoords[polygonCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      polygonCoords.push([...first] as [number, number]);
    }

    const polygon = turf.polygon([polygonCoords]);

    // Check if point is inside polygon
    const isInside = turf.booleanPointInPolygon(point, polygon);

    // Calculate distance to boundary
    const distance = calculateDistanceToBoundary(lat, lng, parcelBoundary);

    if (isInside) {
      return {
        isValid: true,
        distanceToBoundary: distance,
        message: `GPS coordinates are within the parcel boundary (${distance.toFixed(1)}m from nearest edge)`,
        confidence: 95,
      };
    } else {
      // Outside but check how far
      if (distance < 10) {
        return {
          isValid: false,
          distanceToBoundary: distance,
          message: `GPS coordinates are ${distance.toFixed(1)}m outside the parcel boundary — within GPS margin of error`,
          confidence: 60,
        };
      } else if (distance < 50) {
        return {
          isValid: false,
          distanceToBoundary: distance,
          message: `GPS coordinates are ${distance.toFixed(1)}m outside the parcel boundary — nearby but not within parcel`,
          confidence: 30,
        };
      } else {
        return {
          isValid: false,
          distanceToBoundary: distance,
          message: `GPS coordinates are ${distance.toFixed(1)}m outside the parcel boundary — location does not match parcel`,
          confidence: 5,
        };
      }
    }
  } catch (error) {
    return {
      isValid: false,
      distanceToBoundary: -1,
      message: `Validation error: ${(error as Error).message}`,
      confidence: 0,
    };
  }
}

// ─── Distance Calculation ─────────────────────────────────────────

/**
 * Calculate the shortest distance from a point to the nearest edge of a polygon boundary.
 * Uses Turf.js pointToLineDistance for accurate geodesic calculation.
 * 
 * @param lat - Point latitude
 * @param lng - Point longitude
 * @param parcelBoundary - Boundary polygon as [lat, lng] array
 * @returns Distance in metres to nearest boundary edge
 */
export function calculateDistanceToBoundary(
  lat: number,
  lng: number,
  parcelBoundary: [number, number][]
): number {
  try {
    const point = turf.point([lng, lat]);

    // Convert boundary to [lng, lat] for GeoJSON
    const lineCoords = parcelBoundary.map(([pLat, pLng]) => [pLng, pLat] as [number, number]);

    // Ensure closed
    const first = lineCoords[0];
    const last = lineCoords[lineCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      lineCoords.push([...first] as [number, number]);
    }

    const line = turf.lineString(lineCoords);

    // Distance in kilometres, convert to metres
    const distanceKm = turf.pointToLineDistance(point, line, { units: 'kilometers' });
    return Math.round(distanceKm * 1000 * 10) / 10; // metres, 1 decimal
  } catch (error) {
    console.error('Distance calculation error:', (error as Error).message);
    return -1;
  }
}

// ─── GPS Spoofing Detection ───────────────────────────────────────

/**
 * Detect potential GPS spoofing by analyzing coordinate patterns.
 * 
 * Suspicious patterns include:
 * 1. Perfectly round coordinates (e.g., 12.900000, 77.600000)
 * 2. Missing GPS accuracy/HDOP data
 * 3. Impossibly high accuracy (< 0.5m without RTK equipment)
 * 4. Altitude of exactly 0 (common in spoofed data)
 * 5. Coordinates that are exactly the same across multiple readings
 * 
 * @param gpsData - GPS data to analyze
 * @returns Spoofing detection result
 */
export function detectSpoofing(gpsData: {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  timestamp?: string;
}): SpoofingResult {
  const indicators: string[] = [];
  let score = 0;

  // Check 1: Perfectly round coordinates (more than 3 trailing zeros)
  const latStr = gpsData.lat.toString();
  const lngStr = gpsData.lng.toString();
  const latDecimals = latStr.includes('.') ? latStr.split('.')[1] : '';
  const lngDecimals = lngStr.includes('.') ? lngStr.split('.')[1] : '';

  if (latDecimals.length <= 2 || lngDecimals.length <= 2) {
    indicators.push('Coordinates have suspiciously low precision (fewer than 3 decimal places)');
    score += 25;
  }

  if (latDecimals.endsWith('000') || lngDecimals.endsWith('000')) {
    indicators.push('Coordinates have trailing zeros — possible manual entry or spoofing');
    score += 20;
  }

  // Check 2: Missing accuracy data
  if (gpsData.accuracy === undefined || gpsData.accuracy === null) {
    indicators.push('No GPS accuracy/HDOP data — cannot verify measurement quality');
    score += 15;
  }

  // Check 3: Impossibly high accuracy without RTK
  if (gpsData.accuracy !== undefined && gpsData.accuracy < 0.5) {
    indicators.push('GPS accuracy below 0.5m — suspicious without RTK/DGPS equipment');
    score += 20;
  }

  // Check 4: Zero altitude (common in spoofed/simulated data)
  if (gpsData.altitude !== undefined && gpsData.altitude === 0) {
    indicators.push('Altitude is exactly 0m — possible spoofed data');
    score += 10;
  }

  // Check 5: Invalid coordinate ranges
  if (gpsData.lat < -90 || gpsData.lat > 90 || gpsData.lng < -180 || gpsData.lng > 180) {
    indicators.push('Coordinates outside valid range — invalid GPS data');
    score += 40;
  }

  // Check 6: For Indian construction sites, check if coordinates are in India
  // India bounding box: lat 6-36, lng 68-98
  if (gpsData.lat < 6 || gpsData.lat > 36 || gpsData.lng < 68 || gpsData.lng > 98) {
    indicators.push('Coordinates are outside India — unexpected for Indian construction project');
    score += 15;
  }

  // Check 7: Timestamp validation
  if (gpsData.timestamp) {
    const ts = new Date(gpsData.timestamp);
    const now = new Date();
    if (ts > now) {
      indicators.push('GPS timestamp is in the future — likely spoofed');
      score += 30;
    }
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    if (ts < oneYearAgo) {
      indicators.push('GPS timestamp is over 1 year old — data may be stale');
      score += 10;
    }
  }

  // Determine risk level
  let riskLevel: 'none' | 'low' | 'medium' | 'high';
  if (score === 0) riskLevel = 'none';
  else if (score <= 20) riskLevel = 'low';
  else if (score <= 50) riskLevel = 'medium';
  else riskLevel = 'high';

  return {
    isSuspicious: score > 30,
    riskLevel,
    indicators,
    score: Math.min(100, score),
  };
}

// ─── Reverse Geocoding (Approximate) ─────────────────────────────

/**
 * Approximate reverse geocoding using coordinate ranges.
 * Maps coordinates to known Indian city areas without external API calls.
 * 
 * In production, this would call the Google Maps / Mapbox / Nominatim API.
 * For the demo, we use coordinate bounding boxes for major Indian cities.
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Approximate address information
 */
export function reverseGeocode(lat: number, lng: number): ReverseGeocodeResult {
  // Known city coordinate ranges
  const cities: Array<{
    name: string;
    state: string;
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
    areas: Array<{ name: string; latMin: number; latMax: number; lngMin: number; lngMax: number }>;
  }> = [
    {
      name: 'Bengaluru',
      state: 'Karnataka',
      latMin: 12.85,
      latMax: 13.15,
      lngMin: 77.45,
      lngMax: 77.80,
      areas: [
        { name: 'Jayanagar', latMin: 12.91, latMax: 12.93, lngMin: 77.57, lngMax: 77.60 },
        { name: 'Koramangala', latMin: 12.93, latMax: 12.95, lngMin: 77.61, lngMax: 77.64 },
        { name: 'Whitefield', latMin: 12.96, latMax: 12.98, lngMin: 77.73, lngMax: 77.77 },
        { name: 'Hebbal', latMin: 13.02, latMax: 13.05, lngMin: 77.58, lngMax: 77.61 },
        { name: 'Electronic City', latMin: 12.83, latMax: 12.86, lngMin: 77.64, lngMax: 77.68 },
        { name: 'JP Nagar', latMin: 12.89, latMax: 12.92, lngMin: 77.57, lngMax: 77.60 },
        { name: 'Indiranagar', latMin: 12.97, latMax: 12.99, lngMin: 77.63, lngMax: 77.65 },
        { name: 'Malleshwaram', latMin: 12.99, latMax: 13.01, lngMin: 77.55, lngMax: 77.58 },
        { name: 'Banashankari', latMin: 12.90, latMax: 12.93, lngMin: 77.53, lngMax: 77.56 },
        { name: 'Marathahalli', latMin: 12.94, latMax: 12.97, lngMin: 77.69, lngMax: 77.72 },
        { name: 'Yelahanka', latMin: 13.08, latMax: 13.12, lngMin: 77.57, lngMax: 77.61 },
      ],
    },
    {
      name: 'Pune',
      state: 'Maharashtra',
      latMin: 18.45,
      latMax: 18.65,
      lngMin: 73.72,
      lngMax: 73.95,
      areas: [
        { name: 'Kothrud', latMin: 18.50, latMax: 18.52, lngMin: 73.79, lngMax: 73.82 },
        { name: 'Baner', latMin: 18.55, latMax: 18.57, lngMin: 73.77, lngMax: 73.80 },
        { name: 'Hinjawadi', latMin: 18.58, latMax: 18.60, lngMin: 73.72, lngMax: 73.75 },
        { name: 'Wakad', latMin: 18.59, latMax: 18.61, lngMin: 73.75, lngMax: 73.78 },
        { name: 'Koregaon Park', latMin: 18.53, latMax: 18.55, lngMin: 73.88, lngMax: 73.90 },
        { name: 'Viman Nagar', latMin: 18.56, latMax: 18.58, lngMin: 73.90, lngMax: 73.93 },
        { name: 'Shivaji Nagar', latMin: 18.52, latMax: 18.54, lngMin: 73.83, lngMax: 73.86 },
        { name: 'Aundh', latMin: 18.55, latMax: 18.57, lngMin: 73.80, lngMax: 73.82 },
        { name: 'Magarpatta', latMin: 18.50, latMax: 18.52, lngMin: 73.92, lngMax: 73.94 },
        { name: 'Hadapsar', latMin: 18.49, latMax: 18.51, lngMin: 73.92, lngMax: 73.95 },
      ],
    },
    {
      name: 'Lucknow',
      state: 'Uttar Pradesh',
      latMin: 26.78,
      latMax: 26.95,
      lngMin: 80.88,
      lngMax: 81.05,
      areas: [
        { name: 'Gomti Nagar', latMin: 26.84, latMax: 26.86, lngMin: 80.97, lngMax: 81.00 },
        { name: 'Hazratganj', latMin: 26.84, latMax: 26.86, lngMin: 80.93, lngMax: 80.96 },
        { name: 'Aliganj', latMin: 26.87, latMax: 26.89, lngMin: 80.92, lngMax: 80.95 },
        { name: 'Indira Nagar', latMin: 26.86, latMax: 26.88, lngMin: 80.98, lngMax: 81.01 },
        { name: 'Mahanagar', latMin: 26.86, latMax: 26.88, lngMin: 80.94, lngMax: 80.96 },
        { name: 'Charbagh', latMin: 26.85, latMax: 26.87, lngMin: 80.91, lngMax: 80.93 },
        { name: 'Vikas Nagar', latMin: 26.86, latMax: 26.87, lngMin: 80.96, lngMax: 80.98 },
        { name: 'Aminabad', latMin: 26.84, latMax: 26.86, lngMin: 80.93, lngMax: 80.94 },
        { name: 'Rajajipuram', latMin: 26.85, latMax: 26.86, lngMin: 80.90, lngMax: 80.92 },
        { name: 'Jankipuram', latMin: 26.90, latMax: 26.92, lngMin: 80.93, lngMax: 80.95 },
      ],
    },
  ];

  for (const city of cities) {
    if (lat >= city.latMin && lat <= city.latMax && lng >= city.lngMin && lng <= city.lngMax) {
      // Check specific areas
      for (const area of city.areas) {
        if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
          return {
            address: `${area.name}, ${city.name}`,
            city: city.name,
            state: city.state,
            country: 'India',
            area: area.name,
          };
        }
      }
      // City matched but no specific area
      return {
        address: `${city.name} Metropolitan Area`,
        city: city.name,
        state: city.state,
        country: 'India',
        area: 'General Area',
      };
    }
  }

  // No city matched — return generic India location
  if (lat >= 6 && lat <= 36 && lng >= 68 && lng <= 98) {
    return {
      address: `Location at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      city: 'Unknown',
      state: 'Unknown',
      country: 'India',
      area: 'Unidentified Area',
    };
  }

  return {
    address: `Location at ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    city: 'Unknown',
    state: 'Unknown',
    country: 'Unknown',
    area: 'Outside India',
  };
}

// ─── Radius Check ─────────────────────────────────────────────────

/**
 * Check if two GPS points are within a specified radius of each other.
 * Uses the Haversine formula via Turf.js for accurate geodesic distance.
 * 
 * @param lat1 - First point latitude
 * @param lng1 - First point longitude
 * @param lat2 - Second point latitude
 * @param lng2 - Second point longitude
 * @param radiusKm - Maximum distance in kilometres
 * @returns Whether the points are within the specified radius
 */
export function isWithinRadius(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radiusKm: number
): boolean {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  const distance = turf.distance(from, to, { units: 'kilometers' });
  return distance <= radiusKm;
}

/**
 * Calculate the distance between two GPS points in kilometres.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'kilometers' });
}

export default {
  validateCoordinates,
  calculateDistanceToBoundary,
  detectSpoofing,
  reverseGeocode,
  isWithinRadius,
  calculateDistance,
};
