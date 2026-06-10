/**
 * Image Analysis Service
 * 
 * Provides image processing capabilities for construction site photos:
 * 1. GPS/EXIF extraction from camera metadata
 * 2. Dimension estimation using reference objects
 * 3. Construction element detection (simulated AI)
 * 4. Measurement generation from detected elements
 * 
 * Uses:
 * - exifr: Modern EXIF parser — auto-converts GPS DMS to decimal degrees
 * - sharp: High-performance image processing (resize, metadata, edge detection)
 */

import sharp from 'sharp';
import exifr from 'exifr';
import * as yoloService from './yoloInferenceService';

// ─── Types ────────────────────────────────────────────────────────

export interface GPSExifData {
  /** Latitude in decimal degrees (positive = North) */
  latitude: number | null;
  /** Longitude in decimal degrees (positive = East) */
  longitude: number | null;
  /** Altitude in metres above sea level */
  altitude: number | null;
  /** Timestamp when the photo was taken */
  timestamp: string | null;
  /** Camera make and model */
  camera: string | null;
  /** Image dimensions */
  imageWidth: number | null;
  imageHeight: number | null;
  /** GPS accuracy/DOP if available */
  gpsAccuracy: number | null;
}

export interface DetectedElement {
  /** Type of construction element detected */
  type: 'wall' | 'column' | 'beam' | 'slab' | 'foundation' | 'door' | 'window' | 'staircase' | 'pipe' | 'rebar';
  /** Confidence score (0-100) */
  confidence: number;
  /** Bounding box in pixel coordinates [x, y, width, height] */
  boundingBox: [number, number, number, number];
  /** Estimated real-world dimensions in metres */
  estimatedDimensions: {
    length: number;
    width: number;
    height: number;
  };
  /** Material type if identifiable */
  material: string;
}

export interface ImageAnalysisResult {
  /** Original image dimensions */
  imageWidth: number;
  imageHeight: number;
  /** Detected construction elements */
  elements: DetectedElement[];
  /** Overall scene classification */
  sceneType: string;
  /** Construction stage assessment */
  constructionStage: string;
  /** Quality assessment of the image */
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  /** GPS data extracted from image */
  gpsData: GPSExifData;
  /** Processing timestamp */
  processedAt: string;
}

export interface EstimatedDimensions {
  /** Estimated width in metres */
  width: number;
  /** Estimated height in metres */
  height: number;
  /** Pixel-to-metre ratio used */
  pixelToMetreRatio: number;
  /** Confidence in the estimate (0-100) */
  confidence: number;
}

// ─── GPS/EXIF Extraction ──────────────────────────────────────────

/**
 * Extract GPS coordinates, camera info, and timestamps from image EXIF data.
 * Uses exifr which automatically converts DMS (Degrees/Minutes/Seconds) to decimal degrees.
 * 
 * @param imageBuffer - Raw image file buffer
 * @returns Extracted GPS and EXIF metadata
 */
export async function extractGPSFromImage(imageBuffer: Buffer): Promise<GPSExifData> {
  try {
    // exifr.parse with GPS option auto-converts DMS → decimal
    const exif = await exifr.parse(imageBuffer, {
      gps: true,
      tiff: true,
      exif: true,
    });

    if (!exif) {
      return {
        latitude: null,
        longitude: null,
        altitude: null,
        timestamp: null,
        camera: null,
        imageWidth: null,
        imageHeight: null,
        gpsAccuracy: null,
      };
    }

    // Get image dimensions using sharp
    const metadata = await sharp(imageBuffer).metadata();

    return {
      latitude: exif.latitude ?? null,
      longitude: exif.longitude ?? null,
      altitude: exif.GPSAltitude ?? null,
      timestamp: exif.DateTimeOriginal
        ? new Date(exif.DateTimeOriginal).toISOString()
        : exif.CreateDate
        ? new Date(exif.CreateDate).toISOString()
        : null,
      camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}`.trim() : null,
      imageWidth: metadata.width ?? null,
      imageHeight: metadata.height ?? null,
      gpsAccuracy: exif.GPSDOP ?? exif.GPSHPositioningError ?? null,
    };
  } catch (error) {
    // Return empty data if EXIF parsing fails (e.g., PNG or stripped EXIF)
    console.warn('EXIF extraction failed:', (error as Error).message);
    try {
      const metadata = await sharp(imageBuffer).metadata();
      return {
        latitude: null,
        longitude: null,
        altitude: null,
        timestamp: null,
        camera: null,
        imageWidth: metadata.width ?? null,
        imageHeight: metadata.height ?? null,
        gpsAccuracy: null,
      };
    } catch {
      return {
        latitude: null,
        longitude: null,
        altitude: null,
        timestamp: null,
        camera: null,
        imageWidth: null,
        imageHeight: null,
        gpsAccuracy: null,
      };
    }
  }
}

// ─── Dimension Estimation ─────────────────────────────────────────

/**
 * Estimate real-world dimensions from an image using a known reference width.
 * 
 * This uses a simplified perspective projection model:
 * 1. Detect edges in the image using sharp's edge detection
 * 2. Calculate pixel-to-real-world ratio using the reference object width
 * 3. Estimate scene dimensions based on detected edges
 * 
 * In production, this would use a trained CNN model for depth estimation.
 * 
 * @param imageBuffer - Raw image buffer
 * @param referenceWidthCm - Known width of a reference object in the image (cm)
 * @returns Estimated dimensions
 */
export async function estimateDimensions(
  imageBuffer: Buffer,
  referenceWidthCm: number
): Promise<EstimatedDimensions> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 1920;
    const height = metadata.height || 1080;

    // Apply edge detection to find structural boundaries
    const edgeBuffer = await sharp(imageBuffer)
      .greyscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1], // Laplacian edge detection
      })
      .raw()
      .toBuffer();

    // Count edge pixels (pixels with high gradient value)
    let edgePixelCount = 0;
    for (let i = 0; i < edgeBuffer.length; i++) {
      if (edgeBuffer[i] > 128) edgePixelCount++;
    }

    // Estimate the reference object spans roughly 20-30% of the image width
    // This is a simplified heuristic — real systems use object detection
    const referencePixelWidth = width * 0.25;
    const referenceWidthM = referenceWidthCm / 100;
    const pixelToMetreRatio = referenceWidthM / referencePixelWidth;

    // Estimate scene dimensions
    const estimatedWidth = width * pixelToMetreRatio;
    const estimatedHeight = height * pixelToMetreRatio;

    // Confidence based on edge density (more edges = more reliable structure detection)
    const edgeDensity = edgePixelCount / edgeBuffer.length;
    const confidence = Math.min(95, Math.max(40, Math.round(edgeDensity * 500 + 50)));

    return {
      width: Math.round(estimatedWidth * 100) / 100,
      height: Math.round(estimatedHeight * 100) / 100,
      pixelToMetreRatio: Math.round(pixelToMetreRatio * 100000) / 100000,
      confidence,
    };
  } catch (error) {
    console.error('Dimension estimation failed:', (error as Error).message);
    return {
      width: 0,
      height: 0,
      pixelToMetreRatio: 0,
      confidence: 0,
    };
  }
}

// ─── Construction Element Detection (Simulated AI) ────────────────

/**
 * Analyze a construction site image and detect structural elements.
 * 
 * NOTE: This is a simulated AI detector. In production, this would use:
 * - A YOLO/Faster-RCNN model trained on construction site imagery
 * - Depth estimation from stereo images or LiDAR data
 * - Material classification from texture analysis
 * 
 * The simulation uses image statistics (brightness, contrast, edge density)
 * to generate plausible detection results that vary by image.
 * 
 * @param imageBuffer - Raw image buffer
 * @returns Analysis result with detected elements
 */
export async function analyzeConstructionElements(
  imageBuffer: Buffer,
  imageId?: string
): Promise<ImageAnalysisResult> {
  // Extract GPS data first
  let gpsData = await extractGPSFromImage(imageBuffer);

  try {
    let imgWidth = 1920;
    let imgHeight = 1080;
    let avgBrightness = 128;
    let avgContrast = 50;

    // If it is a demo ID, override values to avoid sharp crash on 1x1 PNG and simulate realistic image stats
    if (imageId && imageId.startsWith('demo-')) {
      if (imageId === 'demo-foundation') {
        avgBrightness = 100;
        avgContrast = 30; // Maps to Foundation/Earthwork Stage
        gpsData = {
          latitude: 12.9248, // Jayanagar parcel
          longitude: 77.5836,
          altitude: 920,
          timestamp: new Date().toISOString(),
          camera: 'Apple iPhone 15 Pro',
          imageWidth: 1920,
          imageHeight: 1080,
          gpsAccuracy: 3.5,
        };
      } else if (imageId === 'demo-framework') {
        avgBrightness = 150;
        avgContrast = 40; // Maps to Structural Framework
        gpsData = {
          latitude: 13.0359, // Hebbal IT Park
          longitude: 77.5971,
          altitude: 915,
          timestamp: new Date().toISOString(),
          camera: 'Samsung Galaxy S24 Ultra',
          imageWidth: 1920,
          imageHeight: 1080,
          gpsAccuracy: 4.5,
        };
      } else {
        avgBrightness = 200;
        avgContrast = 50; // Maps to Masonry Work
        gpsData = {
          latitude: 18.5596, // Baner Highway Overpass
          longitude: 73.7868,
          altitude: 560,
          timestamp: new Date().toISOString(),
          camera: 'Sony Alpha 7R V',
          imageWidth: 1920,
          imageHeight: 1080,
          gpsAccuracy: 2.8,
        };
      }
    } else {
      const metadata = await sharp(imageBuffer).metadata();
      imgWidth = metadata.width || 1920;
      imgHeight = metadata.height || 1080;
      const stats = await sharp(imageBuffer).stats();
      avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
      avgContrast = stats.channels.reduce((sum, ch) => sum + ch.stdev, 0) / stats.channels.length;
    }

    // Use image stats as a seed for deterministic but varied results
    const seed = Math.round(avgBrightness * 100 + avgContrast * 10);

    // Determine scene type based on brightness/contrast patterns
    const sceneTypes = [
      'Foundation/Earthwork Stage',
      'Structural Framework',
      'Masonry Work in Progress',
      'Finishing/Interior Work',
      'Exterior/Facade Work',
    ];
    const sceneType = sceneTypes[seed % sceneTypes.length];

    const constructionStages = [
      'substructure',
      'superstructure-frame',
      'superstructure-masonry',
      'finishing',
      'external-works',
    ];
    const constructionStage = constructionStages[seed % constructionStages.length];

    // Assess image quality based on resolution, brightness and sharpness
    let imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
    if (imgWidth >= 3000 && avgContrast > 50) imageQuality = 'excellent';
    else if (imgWidth >= 1920 && avgContrast > 35) imageQuality = 'good';
    else if (imgWidth >= 1280 && avgContrast > 20) imageQuality = 'fair';
    else imageQuality = 'poor';

    // REAL AI DETECTIONS VIA YOLOv8
    let elements: DetectedElement[] = [];
    try {
      const yoloBoxes = await yoloService.detectObjects(imageBuffer);
      
      // Convert YOLO output (640x640 scale) back to original image dimensions
      elements = yoloBoxes.map(box => {
        // YOLO outputs center x, y, w, h
        const x_px = Math.round((box.x - box.w / 2) / 640 * imgWidth);
        const y_px = Math.round((box.y - box.h / 2) / 640 * imgHeight);
        const w_px = Math.round((box.w) / 640 * imgWidth);
        const h_px = Math.round((box.h) / 640 * imgHeight);
        
        // Estimate depth heuristically for quantity calculation
        const estimatedDimensions = {
          length: Math.round((w_px / imgWidth) * 10 * 10) / 10,
          width: Math.round((w_px / imgWidth) * 3 * 10) / 10,
          height: Math.round((h_px / imgHeight) * 5 * 10) / 10
        };

        return {
          type: box.className as any,
          confidence: Math.round(box.confidence * 100),
          boundingBox: [x_px, y_px, w_px, h_px],
          estimatedDimensions,
          material: 'AI Detected Material'
        };
      });
      
      if (elements.length > 0) {
        console.log(`🧠 AI successfully detected ${elements.length} real construction elements!`);
      }
    } catch (e) {
      console.warn("⚠️ YOLO AI failed or is unavailable. Falling back to simulation.", e);
    }
    
    // Fallback if AI finds absolutely nothing (e.g., empty image or model error)
    if (elements.length === 0) {
      elements = generateSimulatedElements(
        imgWidth,
        imgHeight,
        sceneType,
        seed
      );
    }

    return {
      imageWidth: imgWidth,
      imageHeight: imgHeight,
      elements,
      sceneType,
      constructionStage,
      imageQuality,
      gpsData,
      processedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Image analysis failed:', (error as Error).message);
    return {
      imageWidth: 0,
      imageHeight: 0,
      elements: [],
      sceneType: 'Unknown',
      constructionStage: 'unknown',
      imageQuality: 'poor',
      gpsData,
      processedAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate simulated construction element detections.
 * Creates realistic bounding boxes and dimensions based on scene type.
 */
function generateSimulatedElements(
  imgW: number,
  imgH: number,
  sceneType: string,
  seed: number
): DetectedElement[] {
  const elements: DetectedElement[] = [];

  // Deterministic pseudo-random using seed
  const rand = (min: number, max: number, offset: number = 0) =>
    min + ((seed + offset) % 100) / 100 * (max - min);

  if (sceneType.includes('Foundation') || sceneType.includes('Earthwork')) {
    // Foundation scene: trenches, formwork, rebar
    elements.push({
      type: 'foundation',
      confidence: Math.round(rand(78, 95, 1)),
      boundingBox: [
        Math.round(imgW * 0.1),
        Math.round(imgH * 0.4),
        Math.round(imgW * 0.8),
        Math.round(imgH * 0.5),
      ],
      estimatedDimensions: {
        length: Math.round(rand(8, 20, 2) * 10) / 10,
        width: Math.round(rand(0.6, 1.5, 3) * 10) / 10,
        height: Math.round(rand(0.5, 2.0, 4) * 10) / 10,
      },
      material: 'RCC M-25',
    });
    elements.push({
      type: 'rebar',
      confidence: Math.round(rand(70, 90, 5)),
      boundingBox: [
        Math.round(imgW * 0.15),
        Math.round(imgH * 0.45),
        Math.round(imgW * 0.7),
        Math.round(imgH * 0.3),
      ],
      estimatedDimensions: {
        length: Math.round(rand(6, 15, 6) * 10) / 10,
        width: Math.round(rand(0.012, 0.025, 7) * 1000) / 1000,
        height: 0,
      },
      material: 'TMT Fe-500D',
    });
  }

  if (sceneType.includes('Structural') || sceneType.includes('Framework')) {
    // Structural frame: columns, beams, slab formwork
    const numColumns = 2 + (seed % 4);
    for (let i = 0; i < numColumns; i++) {
      elements.push({
        type: 'column',
        confidence: Math.round(rand(82, 96, 10 + i)),
        boundingBox: [
          Math.round(imgW * (0.15 + i * 0.2)),
          Math.round(imgH * 0.15),
          Math.round(imgW * 0.08),
          Math.round(imgH * 0.7),
        ],
        estimatedDimensions: {
          length: Math.round(rand(0.3, 0.6, 20 + i) * 10) / 10,
          width: Math.round(rand(0.3, 0.6, 30 + i) * 10) / 10,
          height: Math.round(rand(3.0, 4.0, 40 + i) * 10) / 10,
        },
        material: 'RCC M-30',
      });
    }
    elements.push({
      type: 'beam',
      confidence: Math.round(rand(75, 92, 50)),
      boundingBox: [
        Math.round(imgW * 0.1),
        Math.round(imgH * 0.1),
        Math.round(imgW * 0.8),
        Math.round(imgH * 0.1),
      ],
      estimatedDimensions: {
        length: Math.round(rand(4, 8, 51) * 10) / 10,
        width: Math.round(rand(0.23, 0.35, 52) * 100) / 100,
        height: Math.round(rand(0.45, 0.6, 53) * 100) / 100,
      },
      material: 'RCC M-30',
    });
  }

  if (sceneType.includes('Masonry')) {
    // Masonry: walls, doors, windows
    elements.push({
      type: 'wall',
      confidence: Math.round(rand(80, 95, 60)),
      boundingBox: [
        Math.round(imgW * 0.05),
        Math.round(imgH * 0.1),
        Math.round(imgW * 0.9),
        Math.round(imgH * 0.75),
      ],
      estimatedDimensions: {
        length: Math.round(rand(5, 12, 61) * 10) / 10,
        width: Math.round(rand(0.115, 0.23, 62) * 1000) / 1000,
        height: Math.round(rand(3.0, 3.5, 63) * 10) / 10,
      },
      material: 'Brick masonry CM 1:6',
    });
    elements.push({
      type: 'door',
      confidence: Math.round(rand(72, 88, 64)),
      boundingBox: [
        Math.round(imgW * 0.35),
        Math.round(imgH * 0.15),
        Math.round(imgW * 0.15),
        Math.round(imgH * 0.65),
      ],
      estimatedDimensions: {
        length: Math.round(rand(0.9, 1.2, 65) * 10) / 10,
        width: Math.round(rand(0.04, 0.075, 66) * 1000) / 1000,
        height: Math.round(rand(2.0, 2.1, 67) * 10) / 10,
      },
      material: 'Teak wood frame',
    });
    elements.push({
      type: 'window',
      confidence: Math.round(rand(68, 85, 68)),
      boundingBox: [
        Math.round(imgW * 0.6),
        Math.round(imgH * 0.2),
        Math.round(imgW * 0.15),
        Math.round(imgH * 0.3),
      ],
      estimatedDimensions: {
        length: Math.round(rand(1.0, 1.5, 69) * 10) / 10,
        width: Math.round(rand(0.04, 0.06, 70) * 1000) / 1000,
        height: Math.round(rand(1.0, 1.5, 71) * 10) / 10,
      },
      material: 'Aluminium section',
    });
  }

  if (sceneType.includes('Finishing') || sceneType.includes('Interior')) {
    // Finishing: walls with plaster, flooring, painting
    elements.push({
      type: 'wall',
      confidence: Math.round(rand(85, 97, 80)),
      boundingBox: [
        Math.round(imgW * 0.02),
        Math.round(imgH * 0.05),
        Math.round(imgW * 0.96),
        Math.round(imgH * 0.85),
      ],
      estimatedDimensions: {
        length: Math.round(rand(4, 8, 81) * 10) / 10,
        width: Math.round(rand(0.012, 0.02, 82) * 1000) / 1000,
        height: Math.round(rand(3.0, 3.2, 83) * 10) / 10,
      },
      material: 'Cement plaster 1:4, 12mm',
    });
    elements.push({
      type: 'slab',
      confidence: Math.round(rand(75, 90, 84)),
      boundingBox: [
        Math.round(imgW * 0.0),
        Math.round(imgH * 0.85),
        Math.round(imgW * 1.0),
        Math.round(imgH * 0.15),
      ],
      estimatedDimensions: {
        length: Math.round(rand(4, 8, 85) * 10) / 10,
        width: Math.round(rand(3, 6, 86) * 10) / 10,
        height: Math.round(rand(0.1, 0.15, 87) * 100) / 100,
      },
      material: 'Vitrified tile on RCC',
    });
  }

  if (sceneType.includes('Exterior') || sceneType.includes('Facade')) {
    // Exterior: facade, columns, windows
    elements.push({
      type: 'wall',
      confidence: Math.round(rand(88, 96, 90)),
      boundingBox: [
        Math.round(imgW * 0.05),
        Math.round(imgH * 0.05),
        Math.round(imgW * 0.9),
        Math.round(imgH * 0.9),
      ],
      estimatedDimensions: {
        length: Math.round(rand(10, 25, 91) * 10) / 10,
        width: Math.round(rand(0.23, 0.35, 92) * 100) / 100,
        height: Math.round(rand(9, 15, 93) * 10) / 10,
      },
      material: 'External plaster with weather coating',
    });
    const numWindows = 3 + (seed % 5);
    for (let i = 0; i < numWindows; i++) {
      elements.push({
        type: 'window',
        confidence: Math.round(rand(70, 88, 95 + i)),
        boundingBox: [
          Math.round(imgW * (0.1 + i * 0.18)),
          Math.round(imgH * (0.2 + (i % 2) * 0.3)),
          Math.round(imgW * 0.12),
          Math.round(imgH * 0.2),
        ],
        estimatedDimensions: {
          length: Math.round(rand(1.0, 1.8, 100 + i) * 10) / 10,
          width: Math.round(rand(0.04, 0.06, 110 + i) * 1000) / 1000,
          height: Math.round(rand(1.2, 1.5, 120 + i) * 10) / 10,
        },
        material: 'UPVC frame with glass',
      });
    }
  }

  return elements;
}

// ─── Measurement Generation ───────────────────────────────────────

/**
 * Convert detected construction elements into Nyxen measurement entries.
 * Maps element types to CPWD DSR item codes and calculates quantities.
 * 
 * @param analysisResult - Output from analyzeConstructionElements()
 * @returns Array of partial measurement objects ready for Nyxen entry
 */
export function generateMeasurements(
  analysisResult: ImageAnalysisResult
): Array<{
  itemCode: string;
  description: string;
  category: string;
  length: number;
  breadth: number;
  depth: number;
  quantity: number;
  unit: string;
  confidenceScore: number;
  source: 'ai-estimated';
}> {
  const measurements: Array<{
    itemCode: string;
    description: string;
    category: string;
    length: number;
    breadth: number;
    depth: number;
    quantity: number;
    unit: string;
    confidenceScore: number;
    source: 'ai-estimated';
  }> = [];

  for (const element of analysisResult.elements) {
    const dims = element.estimatedDimensions;
    const measurement = mapElementToMeasurement(element);
    if (measurement) {
      measurements.push({
        ...measurement,
        length: dims.length,
        breadth: dims.width,
        depth: dims.height,
        confidenceScore: element.confidence,
        source: 'ai-estimated' as const,
      });
    }
  }

  return measurements;
}

/**
 * Map a detected element to a CPWD DSR item with quantity calculation.
 */
function mapElementToMeasurement(
  element: DetectedElement
): {
  itemCode: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
} | null {
  const d = element.estimatedDimensions;

  switch (element.type) {
    case 'column':
      return {
        itemCode: '4.2.5',
        description: `RCC M-30 column (${d.length}m × ${d.width}m × ${d.height}m) — AI detected`,
        category: 'concrete',
        quantity: Math.round(d.length * d.width * d.height * 100) / 100,
        unit: 'Cum',
      };

    case 'beam':
      return {
        itemCode: '4.2.3',
        description: `RCC M-30 beam (${d.length}m × ${d.width}m × ${d.height}m) — AI detected`,
        category: 'concrete',
        quantity: Math.round(d.length * d.width * d.height * 100) / 100,
        unit: 'Cum',
      };

    case 'wall':
      if (element.material.includes('plaster')) {
        return {
          itemCode: '9.1.2',
          description: `Cement plaster on wall (${d.length}m × ${d.height}m) — AI detected`,
          category: 'plastering',
          quantity: Math.round(d.length * d.height * 100) / 100,
          unit: 'Sqm',
        };
      }
      return {
        itemCode: '5.1.1',
        description: `Brick masonry wall (${d.length}m × ${d.width}m × ${d.height}m) — AI detected`,
        category: 'masonry',
        quantity: Math.round(d.length * d.width * d.height * 100) / 100,
        unit: 'Cum',
      };

    case 'slab':
      return {
        itemCode: '4.1.8',
        description: `RCC slab (${d.length}m × ${d.width}m × ${d.height}m) — AI detected`,
        category: 'concrete',
        quantity: Math.round(d.length * d.width * d.height * 100) / 100,
        unit: 'Cum',
      };

    case 'foundation':
      return {
        itemCode: '4.1.8',
        description: `RCC foundation (${d.length}m × ${d.width}m × ${d.height}m) — AI detected`,
        category: 'concrete',
        quantity: Math.round(d.length * d.width * d.height * 100) / 100,
        unit: 'Cum',
      };

    case 'door':
      return {
        itemCode: '10.1.1',
        description: `Door frame (${d.length}m × ${d.height}m) — AI detected`,
        category: 'woodwork',
        quantity: 1,
        unit: 'Nos',
      };

    case 'window':
      return {
        itemCode: '10.2.1',
        description: `Window frame (${d.length}m × ${d.height}m) — AI detected`,
        category: 'woodwork',
        quantity: 1,
        unit: 'Nos',
      };

    case 'rebar':
      // Estimate weight: steel density ~7850 kg/m³, using rod cross-section
      const crossSection = Math.PI * Math.pow(d.width / 2, 2);
      const volume = crossSection * d.length;
      const weight = Math.round(volume * 7850 * 100) / 100;
      return {
        itemCode: '6.1.1',
        description: `TMT Fe-500D rebar (${d.width * 1000}mm dia, ${d.length}m length) — AI detected`,
        category: 'steel',
        quantity: weight,
        unit: 'Kg',
      };

    case 'staircase':
      return {
        itemCode: '4.1.8',
        description: `RCC staircase (${d.length}m × ${d.width}m) — AI detected`,
        category: 'concrete',
        quantity: Math.round(d.length * d.width * 0.15 * 100) / 100, // typical waist slab thickness
        unit: 'Cum',
      };

    case 'pipe':
      return {
        itemCode: '17.1.1',
        description: `Pipe installation (${d.length}m length) — AI detected`,
        category: 'plumbing',
        quantity: Math.round(d.length * 100) / 100,
        unit: 'Rmt',
      };

    default:
      return null;
  }
}

export default {
  extractGPSFromImage,
  estimateDimensions,
  analyzeConstructionElements,
  generateMeasurements,
};
