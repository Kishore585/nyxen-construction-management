import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the workspace root or local backend folder
dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config();

export const ENV = {
  /** Server port — defaults to 3001 */
  PORT: parseInt(process.env.PORT || '3001', 10),

  /** MongoDB connection URI — defaults to local host */
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nyxen',

  /** JWT secret for signing tokens */
  JWT_SECRET: process.env.JWT_SECRET || 'nyxen-ai-secret-key-2024-construction-audit',

  /** JWT token expiry duration */
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',

  /** Node environment */
  NODE_ENV: process.env.NODE_ENV || 'development',

  /** Upload directory for images */
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',

  /** Data store directory for JSON file-based persistence */
  DATA_STORE_DIR: process.env.DATA_STORE_DIR || 'data/store',

  /** Maximum file upload size in bytes (50MB) */
  MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE || '52428800', 10),

  /** CORS origin — frontend dev server */
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',

  /** Default GPS accuracy threshold in meters */
  GPS_ACCURACY_THRESHOLD: parseFloat(process.env.GPS_ACCURACY_THRESHOLD || '50'),

  /** Default geofence radius in kilometers for parcel boundary checks */
  GEOFENCE_RADIUS_KM: parseFloat(process.env.GEOFENCE_RADIUS_KM || '0.5'),

  /** Google Gemini API Key for Vision Analysis */
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

export default ENV;

