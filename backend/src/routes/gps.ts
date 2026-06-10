/**
 * GPS Verification Routes
 * POST /api/gps/verify — Validate GPS coordinates against parcel boundaries
 */

import { Router, Request, Response } from 'express';
import {
  validateCoordinates,
  detectSpoofing,
  reverseGeocode,
} from '../services/geoLocationService';
import { MOCK_REGISTRY } from '../data/mockRegistry';

const router = Router();

/**
 * POST /api/gps/verify
 * Body: { latitude, longitude, surveyNumber?, accuracy?, altitude?, timestamp? }
 */
router.post('/verify', (req: Request, res: Response) => {
  try {
    const { latitude, longitude, surveyNumber, accuracy, altitude, timestamp } = req.body;

    if (latitude === undefined || longitude === undefined) {
      res.status(400).json({ message: 'latitude and longitude are required' });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      res.status(400).json({ message: 'Invalid coordinate values' });
      return;
    }

    // Find parcel boundary from registry if survey number provided
    let parcelValidation = null;
    let registryRecord = null;

    if (surveyNumber) {
      registryRecord = MOCK_REGISTRY.find(
        (r) => r.surveyNumber.toLowerCase() === surveyNumber.toLowerCase()
      );

      if (registryRecord && registryRecord.boundaryPolygon) {
        parcelValidation = validateCoordinates(lat, lng, registryRecord.boundaryPolygon);
      }
    }

    // Run spoofing detection
    const spoofingResult = detectSpoofing({
      lat,
      lng,
      accuracy: accuracy ? parseFloat(accuracy) : undefined,
      altitude: altitude ? parseFloat(altitude) : undefined,
      timestamp,
    });

    // Reverse geocode
    const location = reverseGeocode(lat, lng);

    res.json({
      coordinates: { latitude: lat, longitude: lng },
      location,
      parcelValidation: parcelValidation || {
        isValid: false,
        distanceToBoundary: -1,
        message: surveyNumber
          ? 'Survey number not found in registry'
          : 'No survey number provided — cannot validate against parcel',
        confidence: 0,
      },
      spoofingDetection: spoofingResult,
      registryMatch: registryRecord
        ? {
            surveyNumber: registryRecord.surveyNumber,
            ownerName: registryRecord.ownerName,
            area: registryRecord.area,
            district: registryRecord.district,
            state: registryRecord.state,
          }
        : null,
    });
  } catch (error) {
    console.error('GPS verification error:', error);
    res.status(500).json({ message: 'GPS verification failed' });
  }
});

export default router;
