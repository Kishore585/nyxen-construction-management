/**
 * Project Model
 * 
 * Represents a construction project in the Nyxen system.
 * Refactored to use MongoDB and Mongoose for persistence.
 * Includes a translation layer for blueprintDimensions to bypass MongoDB dot-key limits.
 */

import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ─── Interface ────────────────────────────────────────────────────

export interface Project {
  /** Unique project identifier */
  id: string;
  /** Project name/title */
  name: string;
  /** Detailed project description */
  description: string;
  /** Associated land survey number */
  surveyNumber: string;
  /** Project location with GPS coordinates */
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  /** Contractor company/individual name */
  contractor: string;
  /** Detailed Contractor Information */
  contractorDetails?: {
    licenseNumber: string;
    contactPerson: string;
    phone: string;
  };
  /** Contract Agreement Information */
  agreement?: {
    agreementNumber: string;
    dateOfAgreement: string;
    approvedMaterials: string[];
    blueprintDimensions: Record<string, number>; // itemCode mapped to max expected quantity
  };
  /** Supervising engineer name and qualifications */
  engineer: string;
  /** Current project status */
  status: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  /** Project start date (ISO format) */
  startDate: string;
  /** Expected completion date (ISO format) */
  expectedCompletion: string;
  /** Total project budget in INR */
  totalBudget: number;
  /** Record creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// ─── Mongoose Schema ──────────────────────────────────────────────

const BlueprintDimensionSchema = new Schema(
  {
    itemCode: { type: String, required: true },
    maxQuantity: { type: Number, required: true },
  },
  { _id: false }
);

const ProjectSchema = new Schema<Project & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    surveyNumber: { type: String, required: true },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: true },
    },
    contractor: { type: String, required: true },
    contractorDetails: {
      licenseNumber: { type: String },
      contactPerson: { type: String },
      phone: { type: String },
    },
    agreement: {
      agreementNumber: { type: String },
      dateOfAgreement: { type: String },
      approvedMaterials: [{ type: String }],
      blueprintDimensions: [BlueprintDimensionSchema], // Store as array to support keys with dots
    },
    engineer: { type: String, required: true },
    status: { type: String, enum: ['planning', 'in-progress', 'completed', 'on-hold'], required: true },
    startDate: { type: String, required: true },
    expectedCompletion: { type: String, required: true },
    totalBudget: { type: Number, required: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Model Export
export const ProjectModel = mongoose.model<Project & Document>('Project', ProjectSchema);

// ─── Translation Helpers ──────────────────────────────────────────

/**
 * Transforms database project doc (which has blueprintDimensions as an array)
 * back to the application representation (which expects blueprintDimensions as a key-value record).
 */
function transformProject(doc: any): Project {
  if (!doc) return doc;
  const project = { ...doc };
  if (project.agreement && Array.isArray(project.agreement.blueprintDimensions)) {
    const record: Record<string, number> = {};
    for (const entry of project.agreement.blueprintDimensions) {
      if (entry && entry.itemCode) {
        record[entry.itemCode] = entry.maxQuantity;
      }
    }
    project.agreement.blueprintDimensions = record;
  }
  return project;
}

/**
 * Prepares application project data for writing to MongoDB by transforming
 * key-value record blueprintDimensions to a DB-friendly array format.
 */
function prepareProjectForDB(data: any): any {
  if (!data) return data;
  const dbData = { ...data };
  if (dbData.agreement && dbData.agreement.blueprintDimensions && typeof dbData.agreement.blueprintDimensions === 'object' && !Array.isArray(dbData.agreement.blueprintDimensions)) {
    const arr = [];
    for (const [itemCode, maxQuantity] of Object.entries(dbData.agreement.blueprintDimensions)) {
      arr.push({ itemCode, maxQuantity });
    }
    dbData.agreement = {
      ...dbData.agreement,
      blueprintDimensions: arr,
    };
  }
  return dbData;
}

// ─── CRUD Class ───────────────────────────────────────────────────

export class ProjectStore {
  /**
   * Get all projects.
   */
  static async getAll(): Promise<Project[]> {
    const docs = await ProjectModel.find().lean();
    return docs.map(transformProject);
  }

  /**
   * Get a single project by ID.
   */
  static async getById(id: string): Promise<Project | null> {
    const doc = await ProjectModel.findOne({ id }).lean();
    return transformProject(doc);
  }

  /**
   * Create a new project.
   */
  static async create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const now = new Date().toISOString();
    const dbData = prepareProjectForDB({
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    });
    const newProject = new ProjectModel(dbData);
    const doc = await newProject.save();
    return transformProject(doc.toObject());
  }

  /**
   * Update an existing project by ID.
   * Returns the updated project or null if not found.
   */
  static async update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project | null> {
    const now = new Date().toISOString();
    const dbData = prepareProjectForDB({ ...data, updatedAt: now });

    const doc = await ProjectModel.findOneAndUpdate(
      { id },
      { $set: dbData },
      { new: true }
    ).lean();

    return transformProject(doc);
  }

  /**
   * Delete a project by ID.
   * Returns true if deleted, false if not found.
   */
  static async delete(id: string): Promise<boolean> {
    const res = await ProjectModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  /**
   * Search projects by name or survey number.
   */
  static async search(query: string): Promise<Project[]> {
    const regex = new RegExp(query, 'i');
    const docs = await ProjectModel.find({
      $or: [
        { name: regex },
        { surveyNumber: regex },
        { contractor: regex },
        { 'location.address': regex },
      ],
    }).lean();
    return docs.map(transformProject);
  }

  /**
   * Get projects by status.
   */
  static async getByStatus(status: Project['status']): Promise<Project[]> {
    const docs = await ProjectModel.find({ status }).lean();
    return docs.map(transformProject);
  }

  /**
   * Initialize the store with sample data if empty.
   */
  static async initWithSamples(samples: Project[]): Promise<void> {
    const count = await ProjectModel.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding projects to MongoDB...');
      const dbSamples = samples.map(prepareProjectForDB);
      await ProjectModel.insertMany(dbSamples);
      console.log(`✅ Seeded ${samples.length} projects`);
    }
  }
}

export default ProjectStore;
