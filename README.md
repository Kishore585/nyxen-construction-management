# 🏗️ Nyxen AI — Construction Verification & Auditing System

<div align="center">

**AI-Powered Construction Measurement Book Verification, GPS Validation & Land Registry Cross-Referencing**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## 🎯 Problem Statement

Current construction measurement book (Nyxen) verification and auditing processes rely heavily on:
- Manual site inspections and physical measurements
- Paper-based recording and human validation
- No instant verification of construction location vs. authorized land parcel
- Inability to extract dimensions from standard site photographs

**This results in:** delays, increased costs, measurement disputes, fraudulent reporting, location mismatches, and inefficient project monitoring.

## 💡 Solution

Nyxen AI is an intelligent platform that **autonomously**:

| Feature | Description |
|---------|-------------|
| 📸 **Image Analysis** | Analyzes site photos using photogrammetry to extract physical dimensions and quantities |
| 📍 **GPS Validation** | Validates GPS location data from image EXIF metadata against authorized parcels |
| 🗺️ **Land Registry** | Cross-references survey numbers with official land registry records |
| 📏 **Nyxen Generation** | Generates CPWD/PWD-compliant measurement book entries automatically |
| 🛡️ **Audit Reports** | Produces compliance reports with confidence scores and discrepancy detection |

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + Vite + TS)            │
│  Landing → Dashboard → Analysis → GPS → Registry    │
│           → Nyxen Generator → Audit Reports          │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│            Backend (Express + TypeScript)             │
│  Image Analysis │ GPS Validation │ Land Registry     │
│  Nyxen Service  │ Audit Engine   │ Auth (JWT)        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Data Layer (JSON File Store)             │
│  Projects │ Measurements │ Registry │ Audit Logs     │
└─────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Vanilla CSS (Dark Glassmorphism) |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Animations | Framer Motion |
| Backend | Express + TypeScript |
| Image Processing | Sharp + exifr |
| Geospatial | Turf.js |
| Auth | JWT + bcryptjs |
| Data Store | File-based JSON |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd NYXen

# Install all dependencies
npm run install:all

# Install root dependencies
npm install
```

### Development

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run dev:backend    # Express server on http://localhost:3001
npm run dev:frontend   # Vite dev server on http://localhost:5173
```

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Engineer | engineer | eng123 |
| Auditor | auditor | audit123 |

## 📋 Features in Detail

### 📸 AI Image Analysis
- Upload construction site photos
- Automatic EXIF/GPS data extraction
- AI-powered dimension estimation using reference objects
- Construction element detection (walls, columns, beams, slabs)
- Confidence scores for each measurement

### 📍 GPS Verification
- Extract GPS coordinates from image metadata
- Geofencing validation against authorized parcel boundaries
- GPS spoofing detection
- Distance-to-boundary calculation
- Interactive map visualization

### 🗺️ Land Registry Cross-Reference
- Survey number lookup and validation
- Support for multiple state formats (Maharashtra 7/12, Karnataka RTC, UP Khatauni)
- Parcel boundary visualization on map
- Ownership verification
- Encumbrance and dispute checking
- ULPIN (Bhu-Aadhar) support

### 📏 Nyxen Generator
- CPWD/PWD-compliant measurement entries
- Automatic quantity calculation (L × B × H)
- CPWD DSR item code mapping
- Running account management
- Bill of Quantities generation
- Export to JSON/CSV

### 🛡️ Audit Reports
- 0-100 compliance scoring
- GPS validation score
- Registry verification score
- Measurement accuracy analysis
- Discrepancy detection
- Fraud indicator flagging
- Detailed findings and recommendations

## 📁 Project Structure

```
NYXen/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── layouts/          # Layout wrappers
│   │   ├── services/         # API service layer
│   │   ├── store/            # State management
│   │   └── index.css         # Design system
│   └── index.html
├── backend/                  # Express + TypeScript backend
│   ├── src/
│   │   ├── config/           # Configuration
│   │   ├── data/             # Mock data & registries
│   │   ├── middleware/       # Auth & validation
│   │   ├── models/           # Data models
│   │   ├── routes/           # API routes
│   │   └── services/         # Business logic
│   └── package.json
├── docs/                     # Documentation
├── package.json              # Root monorepo config
└── README.md
```

## 🤝 Contributing

1. Pull the latest changes: `git pull origin rat-1`
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Commit with meaningful messages: `git commit -m "feat: add GPS validation"`
5. Push your branch: `git push origin feature/your-feature`
6. Create a Pull Request

### Commit Convention
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `style:` — Styling changes
- `refactor:` — Code refactoring
- `test:` — Tests

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 👥 Team

Built by the **NYXen Team** 🚀

---

<div align="center">
<strong>Nyxen AI</strong> — Bringing transparency and accuracy to construction verification
</div>
