/**
 * Nyxen AI Backend — Express Server Entry Point
 * 
 * Mounts all API routes, configures middleware, and seeds sample data.
 * Runs on port 3001 (configurable via PORT env var).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import ENV from './config/env';
import { ProjectStore } from './models/Project';
import { MeasurementStore } from './models/Measurement';
import { SAMPLE_PROJECTS, SAMPLE_MEASUREMENTS } from './data/sampleProjects';
import { connectDB } from './config/db';

// Route imports
import authRoutes, { seedUsers } from './routes/auth';
import projectRoutes from './routes/projects';
import analysisRoutes from './routes/analysis';
import gpsRoutes from './routes/gps';
import registryRoutes from './routes/registry';
import nyxenRoutes from './routes/nyxen';
import auditRoutes from './routes/audit';
import dashboardRoutes from './routes/dashboard';

// Middleware
import { requireAuth, optionalAuth } from './middleware/auth';

const app = express();

// ─── Global Middleware ────────────────────────────────────────────

app.use(cors({
  origin: [
    ENV.CORS_ORIGIN, 
    'http://localhost:5174', 
    'http://localhost:5175', 
    'http://127.0.0.1:5173', 
    'http://127.0.0.1:5174'
  ],
  credentials: true,
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(process.cwd(), ENV.UPLOAD_DIR)));

// ─── API Routes ──────────────────────────────────────────────────

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes (require JWT)
app.use('/api/projects', optionalAuth, projectRoutes);
app.use('/api/analysis', optionalAuth, analysisRoutes);
app.use('/api/gps', optionalAuth, gpsRoutes);
app.use('/api/registry', optionalAuth, registryRoutes);
app.use('/api/nyxen', optionalAuth, nyxenRoutes);
app.use('/api/audit', optionalAuth, auditRoutes);
app.use('/api/dashboard', optionalAuth, dashboardRoutes);

// ─── Health Check ────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'Nyxen AI Backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Error Handler ───────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    message: ENV.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// ─── Seed Sample Data ────────────────────────────────────────────

async function seedData() {
  console.log('🌱 Checking for sample data...');
  await ProjectStore.initWithSamples(SAMPLE_PROJECTS);
  await seedUsers();
  console.log('✅ Sample data ready');
}

// ─── Start Server ────────────────────────────────────────────────

async function startServer() {
  await connectDB();
  await seedData();

  app.listen(ENV.PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════╗
  ║     🏗️  Nyxen AI Backend Server       ║
  ║     Port: ${ENV.PORT}                        ║
  ║     Mode: ${ENV.NODE_ENV.padEnd(23)}║
  ║     CORS: ${ENV.CORS_ORIGIN.padEnd(23)}║
  ╚═══════════════════════════════════════╝
    `);
  });
}

startServer();

export default app;
