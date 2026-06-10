# Architecture Documentation — Nyxen AI

## System Overview

Nyxen AI is a full-stack web application designed to automate and verify construction measurement books (Nyxens) using AI-powered image analysis, GPS validation, and land registry cross-referencing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT TIER                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              React + TypeScript + Vite                │   │
│  │                                                       │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │   │
│  │  │ Pages   │  │Components│  │    Services        │   │   │
│  │  │         │  │          │  │                     │   │   │
│  │  │Dashboard│  │GlassCard │  │ API Client          │   │   │
│  │  │Analysis │  │GPSMap    │  │ Auth Token Mgmt     │   │   │
│  │  │GPS      │  │MetricCard│  │                     │   │   │
│  │  │Registry │  │Gauge     │  │                     │   │   │
│  │  │Nyxen    │  │Table     │  │                     │   │   │
│  │  │Audit    │  │Timeline  │  │                     │   │   │
│  │  └─────────┘  └──────────┘  └───────────────────┘   │   │
│  │                                                       │   │
│  │  Libraries: Leaflet, Recharts, Framer Motion,         │   │
│  │             Lucide Icons                               │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │ HTTP/REST (JSON)
┌───────────────────────────┼──────────────────────────────────┐
│                     APPLICATION TIER                          │
│                           │                                   │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │              Express + TypeScript                     │   │
│  │                                                       │   │
│  │  ┌──────────┐   ┌──────────────────────────────┐     │   │
│  │  │Middleware │   │         Routes                │     │   │
│  │  │          │   │                                │     │   │
│  │  │ JWT Auth │   │ /api/auth     → Auth           │     │   │
│  │  │ CORS     │   │ /api/projects → Projects       │     │   │
│  │  │ Morgan   │   │ /api/analysis → Image Analysis │     │   │
│  │  │ Multer   │   │ /api/gps      → GPS Validation │     │   │
│  │  │          │   │ /api/registry → Land Registry   │     │   │
│  │  └──────────┘   │ /api/nyxen    → Nyxen Gen      │     │   │
│  │                  │ /api/audit    → Audit Reports   │     │   │
│  │                  └──────────────────────────────┘     │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │              Services                         │    │   │
│  │  │                                               │    │   │
│  │  │  imageAnalysisService   - EXIF/GPS extraction │    │   │
│  │  │                         - Dimension estimation │    │   │
│  │  │                         - Element detection    │    │   │
│  │  │                                               │    │   │
│  │  │  geoLocationService     - Coordinate validation│    │   │
│  │  │                         - Geofencing (Turf.js) │    │   │
│  │  │                         - Spoofing detection   │    │   │
│  │  │                                               │    │   │
│  │  │  landRegistryService    - Survey number lookup │    │   │
│  │  │                         - Boundary retrieval   │    │   │
│  │  │                         - Encumbrance check    │    │   │
│  │  │                                               │    │   │
│  │  │  nyxenService           - CPWD format entries  │    │   │
│  │  │                         - Quantity calculation  │    │   │
│  │  │                         - BOQ generation       │    │   │
│  │  │                                               │    │   │
│  │  │  auditService           - Compliance scoring   │    │   │
│  │  │                         - Discrepancy detect   │    │   │
│  │  │                         - Report generation    │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                   │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                      DATA TIER                                 │
│                           │                                    │
│  ┌────────────────────────▼──────────────────────────────┐   │
│  │              File-Based JSON Store                     │   │
│  │                                                        │   │
│  │  backend/data/store/                                   │   │
│  │  ├── projects.json      - Project records              │   │
│  │  ├── measurements.json  - Measurement entries          │   │
│  │  └── audits.json        - Audit report history         │   │
│  │                                                        │   │
│  │  backend/data/                                         │   │
│  │  ├── mockRegistry.ts    - Land registry mock data      │   │
│  │  └── sampleProjects.ts  - Demo project data            │   │
│  │                                                        │   │
│  │  backend/uploads/       - Uploaded site images          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Image Analysis Flow
```
1. User uploads image(s) via ImageUploader component
2. Frontend sends POST /api/analysis/upload (multipart/form-data)
3. Backend saves image to uploads/ directory
4. imageAnalysisService extracts EXIF data (GPS, camera, timestamp)
5. imageAnalysisService estimates dimensions using reference objects
6. imageAnalysisService detects construction elements
7. Results returned with confidence scores
8. Frontend displays measurements, GPS data, and detected elements
```

### GPS Verification Flow
```
1. GPS coordinates extracted from image EXIF (or entered manually)
2. Survey number provided for the authorized parcel
3. landRegistryService retrieves parcel boundary polygon
4. geoLocationService.validateCoordinates() checks point-in-polygon
5. geoLocationService.detectSpoofing() checks metadata consistency
6. Results: inside/outside parcel, distance to boundary, risk score
7. Frontend displays on GPSMap with boundary overlay
```

### Nyxen Generation Flow
```
1. AI analysis produces measurement estimates
2. User reviews/edits measurements in MeasurementTable
3. nyxenService formats entries in CPWD format
4. Running account calculated across all visits
5. Bill of Quantities cross-referenced
6. Nyxen exported as JSON/CSV
```

### Audit Report Flow
```
1. auditService aggregates all verification data for project
2. GPS validation score calculated
3. Registry verification score calculated
4. Measurement accuracy score calculated
5. Discrepancies detected and findings generated
6. Overall compliance score = weighted average
7. Report generated with findings, scores, recommendations
```

## Security Model

| Layer | Mechanism |
|-------|-----------|
| Authentication | JWT tokens (24-hour expiry) |
| Authorization | Role-based (admin, engineer, auditor) |
| Data Integrity | Image hash verification (planned) |
| GPS Anti-Spoofing | Metadata consistency checks |
| API Security | CORS, Helmet, rate limiting |

## Key Design Decisions

1. **File-based JSON storage** instead of a database — simplifies deployment and eliminates external dependencies for the MVP
2. **Mock land registry** — India lacks a unified public API; designed for easy swapping with real APIs
3. **Server-side image processing** — Sharp + exifr on the server rather than browser-side OpenCV.js to reduce client bundle size
4. **Turf.js for geospatial** — Proven library for point-in-polygon, distance calculations
5. **CPWD format compliance** — Follows the standard Indian government measurement book format
6. **ULPIN support** — Future-ready for India's Bhu-Aadhar land identification system

## Future Enhancements

- **Phase 2**: OpenCV/Python service for full Structure-from-Motion photogrammetry
- **Phase 3**: Real land registry API integration (Bhoomi, Bhulekh, Meebhoomi)
- **Phase 4**: Mobile app with offline-first capability
- **Phase 5**: Blockchain audit trail for tamper-proof verification
