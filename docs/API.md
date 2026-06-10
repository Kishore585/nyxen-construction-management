# API Reference — Nyxen AI

Base URL: `http://localhost:3001/api`

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Authentication

### POST /api/auth/login
Login and receive JWT token.

**Request:**
```json
{
  "username": "engineer",
  "password": "eng123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-002",
      "username": "engineer",
      "role": "engineer",
      "name": "Rajesh Kumar"
    }
  }
}
```

### POST /api/auth/register
Register new user. (Admin only)

### GET /api/auth/profile 🔒
Get current user profile.

---

## Projects

### GET /api/projects 🔒
List all projects.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "proj-001",
      "name": "Residential Complex Block A",
      "surveyNumber": "123/1A",
      "location": { "lat": 12.9716, "lng": 77.5946, "address": "Bangalore, Karnataka" },
      "status": "in-progress",
      "totalBudget": 15000000,
      "startDate": "2026-01-15"
    }
  ]
}
```

### POST /api/projects 🔒
Create new project.

### GET /api/projects/:id 🔒
Get project details with measurements.

### PUT /api/projects/:id 🔒
Update project.

---

## Image Analysis

### POST /api/analysis/upload 🔒
Upload site images for analysis.

**Request:** `multipart/form-data` with `images` field (max 10 files, 50MB each)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "uploadId": "upload-abc123",
    "files": [
      {
        "filename": "site_photo_001.jpg",
        "size": 4520000,
        "path": "/uploads/upload-abc123/site_photo_001.jpg"
      }
    ]
  }
}
```

### POST /api/analysis/process 🔒
Process uploaded images with AI analysis.

**Request:**
```json
{
  "uploadId": "upload-abc123",
  "projectId": "proj-001",
  "referenceWidthCm": 30
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "analysisId": "analysis-xyz789",
    "gpsData": {
      "lat": 12.9716,
      "lng": 77.5946,
      "altitude": 920,
      "accuracy": 3.5,
      "timestamp": "2026-06-07T10:30:00+05:30"
    },
    "detectedElements": [
      {
        "type": "column",
        "confidence": 0.87,
        "dimensions": { "width": 0.45, "height": 3.2 },
        "boundingBox": { "x": 120, "y": 50, "width": 80, "height": 300 }
      }
    ],
    "measurements": [
      {
        "description": "RCC Column 300x450mm",
        "category": "concrete",
        "length": 0.3,
        "breadth": 0.45,
        "depth": 3.2,
        "quantity": 0.432,
        "unit": "Cum",
        "confidenceScore": 87
      }
    ],
    "overallConfidence": 82
  }
}
```

### GET /api/analysis/:id 🔒
Get analysis results.

---

## GPS Validation

### POST /api/gps/validate 🔒
Validate GPS coordinates against an authorized parcel.

**Request:**
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "surveyNumber": "123/1A"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isWithinParcel": true,
    "distanceToBoundary": 45.2,
    "distanceUnit": "meters",
    "spoofingRisk": "low",
    "spoofingScore": 15,
    "parcelDetails": {
      "surveyNumber": "123/1A",
      "village": "Koramangala",
      "district": "Bangalore Urban"
    },
    "validationTimestamp": "2026-06-07T10:30:00Z"
  }
}
```

### POST /api/gps/extract 🔒
Extract GPS from uploaded image.

### GET /api/gps/geofence/:surveyNo 🔒
Get geofence boundary for a survey number.

---

## Land Registry

### GET /api/registry/verify/:surveyNo 🔒
Verify a survey number exists in the registry.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exists": true,
    "surveyNumber": "123/1A",
    "state": "Karnataka",
    "district": "Bangalore Urban",
    "taluk": "Bangalore South",
    "village": "Koramangala",
    "ownerName": "Ramesh Sharma",
    "area": 0.45,
    "areaUnit": "hectares",
    "landUse": "residential",
    "encumbrances": [],
    "ulpin": "KA12BU004501",
    "registrationDate": "2018-03-15",
    "boundary": [[12.9710, 77.5940], [12.9720, 77.5940], ...]
  }
}
```

### GET /api/registry/parcel/:surveyNo 🔒
Get parcel boundary polygon for map display.

### POST /api/registry/cross-reference 🔒
Cross-reference survey number with GPS coordinates.

---

## Nyxen

### POST /api/nyxen/generate 🔒
Generate Nyxen entries from analysis results.

**Request:**
```json
{
  "projectId": "proj-001",
  "analysisId": "analysis-xyz789"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "nyxenId": "nyxen-001",
    "projectId": "proj-001",
    "entries": [
      {
        "serialNo": 1,
        "itemCode": "4.1.1",
        "description": "Providing and laying RCC M25 grade in columns",
        "unit": "Cum",
        "measurements": [
          {
            "description": "Column C1, Ground Floor",
            "number": 4,
            "length": 0.3,
            "breadth": 0.45,
            "depth": 3.2,
            "quantity": 1.728
          }
        ],
        "totalQuantity": 1.728,
        "rate": 8500,
        "amount": 14688
      }
    ],
    "summary": {
      "totalItems": 1,
      "totalAmount": 14688,
      "currency": "INR"
    }
  }
}
```

### GET /api/nyxen/:projectId 🔒
Get Nyxen for project.

### GET /api/nyxen/:projectId/export?format=csv 🔒
Export Nyxen.

---

## Audit

### POST /api/audit/report 🔒
Generate comprehensive audit report.

**Request:**
```json
{
  "projectId": "proj-001"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reportId": "audit-001",
    "projectId": "proj-001",
    "overallScore": 85,
    "gpsValidation": { "status": "pass", "score": 92, "details": "GPS within authorized parcel" },
    "registryVerification": { "status": "pass", "score": 88, "details": "Survey number verified" },
    "measurementAccuracy": { "status": "warning", "score": 75, "details": "2 measurements below confidence threshold" },
    "findings": [
      {
        "severity": "warning",
        "title": "Low Confidence Measurement",
        "description": "Earthwork measurement has 62% confidence score",
        "recommendation": "Re-measure with physical verification"
      }
    ],
    "recommendations": [
      "Schedule physical site inspection for earthwork verification",
      "Update reference markers for improved AI accuracy"
    ],
    "generatedAt": "2026-06-07T10:30:00Z"
  }
}
```

### GET /api/audit/:projectId 🔒
Get audit history for project.

---

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Description of the error"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request — Invalid input |
| 401 | Unauthorized — Missing or invalid token |
| 403 | Forbidden — Insufficient permissions |
| 404 | Not Found — Resource doesn't exist |
| 500 | Server Error — Internal error |
