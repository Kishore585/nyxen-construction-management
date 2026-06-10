/**
 * Audit Report Model
 * 
 * Represents a comprehensive audit report for a construction project.
 * Refactored to use MongoDB and Mongoose for persistence.
 */

import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ─── Interfaces ───────────────────────────────────────────────────

export interface AuditFinding {
  /** Severity level of the finding */
  severity: 'critical' | 'warning' | 'info';
  /** Short title of the finding */
  title: string;
  /** Detailed description of the issue */
  description: string;
  /** Recommended corrective action */
  recommendation: string;
}

export interface AuditValidation {
  /** Status label (e.g., 'pass', 'fail', 'partial') */
  status: string;
  /** Numeric score (0-100) */
  score: number;
  /** Detailed explanation */
  details: string;
}

export interface AuditReport {
  /** Unique report identifier */
  id: string;
  /** Associated project ID */
  projectId: string;
  /** Type of audit performed */
  type: 'comprehensive' | 'measurement' | 'location' | 'compliance';
  /** Overall audit score (0-100) */
  overallScore: number;
  /** GPS/location validation results */
  gpsValidation: AuditValidation;
  /** Land registry cross-reference results */
  registryVerification: AuditValidation;
  /** Measurement accuracy assessment */
  measurementAccuracy: AuditValidation;
  /** List of audit findings */
  findings: AuditFinding[];
  /** High-level recommendations */
  recommendations: string[];
  /** Report generation timestamp */
  generatedAt: string;
  /** User who generated the report */
  generatedBy: string;
}

// ─── Mongoose Schema ──────────────────────────────────────────────

const AuditFindingSchema = new Schema<AuditFinding>({
  severity: { type: String, enum: ['critical', 'warning', 'info'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  recommendation: { type: String, required: true },
});

const AuditValidationSchema = new Schema<AuditValidation>({
  status: { type: String, required: true },
  score: { type: Number, required: true },
  details: { type: String, required: true },
});

const AuditReportSchema = new Schema<AuditReport & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    type: { type: String, enum: ['comprehensive', 'measurement', 'location', 'compliance'], required: true },
    overallScore: { type: Number, required: true },
    gpsValidation: { type: AuditValidationSchema, required: true },
    registryVerification: { type: AuditValidationSchema, required: true },
    measurementAccuracy: { type: AuditValidationSchema, required: true },
    findings: [AuditFindingSchema],
    recommendations: [{ type: String }],
    generatedAt: { type: String, required: true },
    generatedBy: { type: String, required: true },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

export const AuditReportModel = mongoose.model<AuditReport & Document>('AuditReport', AuditReportSchema);

// ─── CRUD Class ───────────────────────────────────────────────────

export class AuditReportStore {
  static async getAll(): Promise<AuditReport[]> {
    const docs = await AuditReportModel.find().lean();
    return docs as unknown as AuditReport[];
  }

  static async getById(id: string): Promise<AuditReport | null> {
    const doc = await AuditReportModel.findOne({ id }).lean();
    return (doc as unknown as AuditReport) || null;
  }

  /**
   * Get all audit reports for a specific project.
   */
  static async getByProjectId(projectId: string): Promise<AuditReport[]> {
    const docs = await AuditReportModel.find({ projectId }).lean();
    return docs as unknown as AuditReport[];
  }

  /**
   * Get the latest audit report for a project.
   */
  static async getLatestForProject(projectId: string): Promise<AuditReport | null> {
    const reports = await this.getByProjectId(projectId);
    if (reports.length === 0) return null;
    return reports.sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
    )[0];
  }

  /**
   * Save a new audit report.
   */
  static async create(data: Omit<AuditReport, 'id' | 'generatedAt'>): Promise<AuditReport> {
    const newDoc = new AuditReportModel({
      ...data,
      id: uuidv4(),
      generatedAt: new Date().toISOString(),
    });
    const doc = await newDoc.save();
    return doc.toObject() as unknown as AuditReport;
  }

  /**
   * Delete an audit report.
   */
  static async delete(id: string): Promise<boolean> {
    const res = await AuditReportModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  /**
   * Get reports filtered by type.
   */
  static async getByType(type: AuditReport['type']): Promise<AuditReport[]> {
    const docs = await AuditReportModel.find({ type }).lean();
    return docs as unknown as AuditReport[];
  }

  /**
   * Get summary statistics across all reports.
   */
  static async getOverallStats(): Promise<{
    totalReports: number;
    averageScore: number;
    criticalFindings: number;
    warningFindings: number;
  }> {
    const reports = await this.getAll();
    let totalScore = 0;
    let criticalFindings = 0;
    let warningFindings = 0;

    for (const r of reports) {
      totalScore += r.overallScore;
      for (const f of r.findings) {
        if (f.severity === 'critical') criticalFindings++;
        if (f.severity === 'warning') warningFindings++;
      }
    }

    return {
      totalReports: reports.length,
      averageScore: reports.length > 0 ? totalScore / reports.length : 0,
      criticalFindings,
      warningFindings,
    };
  }
}

export default AuditReportStore;
