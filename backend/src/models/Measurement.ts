/**
 * Measurement Model
 * 
 * Represents a single measurement entry in a construction Nyxen.
 * Refactored to use MongoDB and Mongoose for persistence.
 */

import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ─── Interface ────────────────────────────────────────────────────

export interface Measurement {
  /** Unique measurement identifier */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** CPWD DSR (Delhi Schedule of Rates) item code */
  itemCode: string;
  /** Detailed description of the work item */
  description: string;
  /** Work category classification */
  category:
    | 'earthwork'
    | 'concrete'
    | 'masonry'
    | 'steel'
    | 'plastering'
    | 'painting'
    | 'woodwork'
    | 'flooring'
    | 'roofing'
    | 'plumbing'
    | 'electrical';
  /** Location within the project site where measurement was taken */
  location: string;
  
  /** Number of similar items (multiplier) */
  number: number;
  
  // -- Dual Measurements Support --
  /** AI-derived dimensions */
  aiDimensions?: {
    length: number;
    breadth: number;
    depth: number;
    quantity: number;
  };
  
  /** Manually verified/recorded dimensions */
  manualDimensions?: {
    length: number;
    breadth: number;
    depth: number;
    quantity: number;
  };
  
  // Legacy fields (kept for backward compatibility during migration)
  length: number;
  breadth: number;
  depth: number;
  quantity: number;

  /** Unit of measurement */
  unit: 'Cum' | 'Sqm' | 'Rmt' | 'Kg' | 'Nos' | 'LS';
  /** Rate per unit in INR (from DSR or negotiated) */
  rate: number;
  /** Total amount = final quantity × Rate, in INR */
  amount: number;
  
  /** AI confidence score (0-100) for estimated measurements */
  confidenceScore: number;
  /** Source/method of measurement */
  source: 'ai-estimated' | 'manual' | 'verified';
  
  // -- Material Verification --
  materialsCheck?: {
    materialUsed: string;
    engineerVerified: boolean;
    constructorVerified: boolean;
  };
  
  // -- Contract Violation Warning --
  violationWarning?: string | null;

  /** Associated image file paths */
  images: string[];
  /** GPS data from where the measurement was recorded */
  gpsData: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null;
  /** User who recorded the measurement */
  recordedBy: string;
  /** User who verified (null if unverified) */
  verifiedBy: string | null;
  /** Creation timestamp */
  createdAt: string;
}

// ─── Mongoose Schema ──────────────────────────────────────────────

const MeasurementSchema = new Schema<Measurement & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    itemCode: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'earthwork',
        'concrete',
        'masonry',
        'steel',
        'plastering',
        'painting',
        'woodwork',
        'flooring',
        'roofing',
        'plumbing',
        'electrical',
      ],
      required: true,
    },
    location: { type: String, required: true },
    number: { type: Number, required: true, default: 1 },
    aiDimensions: {
      length: { type: Number, default: 0 },
      breadth: { type: Number, default: 0 },
      depth: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
    },
    manualDimensions: {
      length: { type: Number, default: 0 },
      breadth: { type: Number, default: 0 },
      depth: { type: Number, default: 0 },
      quantity: { type: Number, default: 0 },
    },
    length: { type: Number, required: true, default: 0 },
    breadth: { type: Number, required: true, default: 0 },
    depth: { type: Number, required: true, default: 0 },
    quantity: { type: Number, required: true, default: 0 },
    unit: { type: String, enum: ['Cum', 'Sqm', 'Rmt', 'Kg', 'Nos', 'LS'], required: true },
    rate: { type: Number, required: true, default: 0 },
    amount: { type: Number, required: true, default: 0 },
    confidenceScore: { type: Number, required: true, default: 100 },
    source: { type: String, enum: ['ai-estimated', 'manual', 'verified'], required: true, default: 'manual' },
    materialsCheck: {
      materialUsed: { type: String },
      engineerVerified: { type: Boolean, default: false },
      constructorVerified: { type: Boolean, default: false },
    },
    violationWarning: { type: String, default: null },
    images: [{ type: String }],
    gpsData: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
      timestamp: { type: String },
    },
    recordedBy: { type: String, required: true },
    verifiedBy: { type: String, default: null },
    createdAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const MeasurementModel = mongoose.model<Measurement & Document>('Measurement', MeasurementSchema);

// ─── CRUD Class ───────────────────────────────────────────────────

export class MeasurementStore {
  static async getAll(): Promise<Measurement[]> {
    const docs = await MeasurementModel.find().lean();
    return docs as unknown as Measurement[];
  }

  static async getById(id: string): Promise<Measurement | null> {
    const doc = await MeasurementModel.findOne({ id }).lean();
    return (doc as unknown as Measurement) || null;
  }

  /**
   * Get all measurements for a specific project.
   */
  static async getByProjectId(projectId: string): Promise<Measurement[]> {
    const docs = await MeasurementModel.find({ projectId }).lean();
    return docs as unknown as Measurement[];
  }

  /**
   * Get measurements filtered by category.
   */
  static async getByCategory(projectId: string, category: Measurement['category']): Promise<Measurement[]> {
    const docs = await MeasurementModel.find({ projectId, category }).lean();
    return docs as unknown as Measurement[];
  }

  /**
   * Run contract validation logic against the Project's agreement details.
   */
  private static async validateAgainstContract(measurement: Measurement): Promise<string | null> {
    const { ProjectStore } = require('./Project');
    const project = await ProjectStore.getById(measurement.projectId);
    
    if (!project || !project.agreement) return null;
    
    const warnings: string[] = [];
    const agreement = project.agreement;

    // 1. Check material verification
    if (measurement.materialsCheck && measurement.materialsCheck.materialUsed) {
      if (!agreement.approvedMaterials.includes(measurement.materialsCheck.materialUsed)) {
        warnings.push(`Unauthorized material: '${measurement.materialsCheck.materialUsed}' is not in the approved contract list.`);
      }
    }

    // 2. Check blueprint quantity limits
    if (agreement.blueprintDimensions && agreement.blueprintDimensions[measurement.itemCode] !== undefined) {
      const maxQuantity = agreement.blueprintDimensions[measurement.itemCode];
      
      // Calculate total quantity for this item code across the project
      const allMeasurements = await this.getByProjectId(measurement.projectId);
      const currentTotal = allMeasurements
        .filter(m => m.itemCode === measurement.itemCode && m.id !== measurement.id)
        .reduce((sum, m) => sum + m.quantity, 0);
        
      if (currentTotal + measurement.quantity > maxQuantity) {
        warnings.push(`Blueprint exceeded: Total quantity (${currentTotal + measurement.quantity}) exceeds contracted amount (${maxQuantity}) for item ${measurement.itemCode}.`);
      }
    }

    return warnings.length > 0 ? warnings.join(' | ') : null;
  }

  /**
   * Create a new measurement entry.
   * Automatically calculates quantity and amount if not provided.
   */
  static async create(data: Omit<Measurement, 'id' | 'createdAt'>): Promise<Measurement> {
    // Auto-calculate quantity if zero (using CPWD formula: N × L × B × D)
    let quantity = data.quantity;
    if (quantity === 0 && data.number > 0) {
      const l = data.manualDimensions?.length || data.length;
      const b = data.manualDimensions?.breadth || data.breadth;
      const d = data.manualDimensions?.depth || data.depth;
      
      if (data.unit === 'Cum') {
        quantity = data.number * l * b * d;
      } else if (data.unit === 'Sqm') {
        quantity = data.number * l * b;
      } else if (data.unit === 'Rmt') {
        quantity = data.number * l;
      } else if (data.unit === 'Nos') {
        quantity = data.number;
      } else if (data.unit === 'Kg') {
        quantity = data.number * l;
      }
    }

    const amount = data.amount || quantity * data.rate;

    const mObject: any = {
      ...data,
      id: uuidv4(),
      quantity,
      amount,
      createdAt: new Date().toISOString(),
    };

    // Run contract validation
    mObject.violationWarning = await this.validateAgainstContract(mObject);

    const newDoc = new MeasurementModel(mObject);
    const doc = await newDoc.save();
    return doc.toObject() as unknown as Measurement;
  }

  /**
   * Update an existing measurement entry.
   */
  static async update(id: string, data: Partial<Omit<Measurement, 'id' | 'createdAt'>>): Promise<Measurement | null> {
    const existing = await MeasurementModel.findOne({ id }).lean();
    if (!existing) return null;

    let updatedFields = { ...existing, ...data };

    // Recalculate quantity if dimensions changed
    if (
      data.number !== undefined ||
      data.length !== undefined ||
      data.breadth !== undefined ||
      data.depth !== undefined ||
      data.manualDimensions !== undefined
    ) {
      const l = data.manualDimensions?.length ?? updatedFields.length;
      const b = data.manualDimensions?.breadth ?? updatedFields.breadth;
      const d = data.manualDimensions?.depth ?? updatedFields.depth;
      const n = updatedFields.number;
      
      if (updatedFields.unit === 'Cum') {
        updatedFields.quantity = n * l * b * d;
      } else if (updatedFields.unit === 'Sqm') {
        updatedFields.quantity = n * l * b;
      } else if (updatedFields.unit === 'Rmt') {
        updatedFields.quantity = n * l;
      } else if (updatedFields.unit === 'Nos') {
        updatedFields.quantity = n;
      } else if (updatedFields.unit === 'Kg') {
        updatedFields.quantity = n * l;
      }
      
      updatedFields.quantity = Math.round(updatedFields.quantity * 100) / 100;
    }

    // Recalculate amount if rate or quantity changed
    if (data.rate !== undefined || data.quantity !== undefined || data.manualDimensions !== undefined) {
      updatedFields.amount = Math.round(updatedFields.quantity * updatedFields.rate * 100) / 100;
    }

    // Run contract validation
    updatedFields.violationWarning = await this.validateAgainstContract(updatedFields);

    const doc = await MeasurementModel.findOneAndUpdate(
      { id },
      { $set: updatedFields },
      { new: true }
    ).lean();

    return (doc as unknown as Measurement) || null;
  }

  static async delete(id: string): Promise<boolean> {
    const res = await MeasurementModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  /**
   * Verify a measurement — update source to 'verified' and set verifiedBy.
   */
  static async verify(id: string, verifiedBy: string): Promise<Measurement | null> {
    return this.update(id, { source: 'verified', verifiedBy });
  }

  /**
   * Get summary statistics for a project.
   */
  static async getProjectSummary(projectId: string): Promise<{
    totalMeasurements: number;
    totalAmount: number;
    verifiedCount: number;
    aiEstimatedCount: number;
    averageConfidence: number;
    categorySummary: Record<string, { count: number; amount: number }>;
  }> {
    const measurements = await this.getByProjectId(projectId);
    const categorySummary: Record<string, { count: number; amount: number }> = {};

    let totalAmount = 0;
    let totalConfidence = 0;
    let verifiedCount = 0;
    let aiEstimatedCount = 0;

    for (const m of measurements) {
      totalAmount += m.amount;
      totalConfidence += m.confidenceScore;
      if (m.source === 'verified') verifiedCount++;
      if (m.source === 'ai-estimated') aiEstimatedCount++;

      if (!categorySummary[m.category]) {
        categorySummary[m.category] = { count: 0, amount: 0 };
      }
      categorySummary[m.category].count++;
      categorySummary[m.category].amount += m.amount;
    }

    return {
      totalMeasurements: measurements.length,
      totalAmount,
      verifiedCount,
      aiEstimatedCount,
      averageConfidence: measurements.length > 0 ? totalConfidence / measurements.length : 0,
      categorySummary,
    };
  }

  /**
   * Initialize store with sample measurements if empty.
   */
  static async initWithSamples(samples: Measurement[]): Promise<void> {
    const count = await MeasurementModel.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding measurements to MongoDB...');
      await MeasurementModel.insertMany(samples);
      console.log(`✅ Seeded ${samples.length} measurements`);
    }
  }
}

export default MeasurementStore;
