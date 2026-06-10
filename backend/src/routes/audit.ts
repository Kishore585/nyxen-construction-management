/**
 * Audit Report Routes
 * GET /api/audit/:projectId — Generate comprehensive audit report for a project
 */

import { Router, Request, Response } from 'express';
import { ProjectStore } from '../models/Project';
import { MeasurementStore } from '../models/Measurement';
import { AuditReportStore, AuditFinding } from '../models/AuditReport';
import { MOCK_REGISTRY } from '../data/mockRegistry';
import { validateCoordinates, detectSpoofing } from '../services/geoLocationService';
import { requireRole } from '../middleware/rbac';

const router = Router();

/**
 * GET /api/audit/:projectId
 * Generates a comprehensive audit report by analyzing:
 * - GPS validation against land registry
 * - Land registry cross-referencing
 * - Measurement accuracy and confidence scores
 *
 * Restricted to: Admin, Supervisor, Auditor (Jr. Engineer cannot generate)
 */
router.get('/:projectId', requireRole('Admin', 'Engineer', 'Supervisor', 'Auditor'), async (req: Request, res: Response) => {
  try {
    const project = await ProjectStore.getById(req.params.projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const measurements = await MeasurementStore.getByProjectId(req.params.projectId);
    const summary = await MeasurementStore.getProjectSummary(req.params.projectId);

    // ── GPS Validation ──────────────────────────────
    let gpsScore = 0;
    let gpsDetails = '';
    const gpsFindings: AuditFinding[] = [];

    const registryRecord = MOCK_REGISTRY.find(
      (r) => r.surveyNumber === project.surveyNumber
    );

    if (registryRecord) {
      // Check all measurements with GPS data against the parcel boundary
      const withGps = measurements.filter((m) => m.gpsData);
      const totalGps = withGps.length;
      let validCount = 0;
      let spoofSuspicious = 0;

      for (const m of withGps) {
        if (m.gpsData) {
          const validation = validateCoordinates(
            m.gpsData.lat,
            m.gpsData.lng,
            registryRecord.boundaryPolygon
          );
          if (validation.isValid) validCount++;

          const spoofCheck = detectSpoofing({
            lat: m.gpsData.lat,
            lng: m.gpsData.lng,
            accuracy: m.gpsData.accuracy,
            timestamp: m.gpsData.timestamp,
          });
          if (spoofCheck.isSuspicious) spoofSuspicious++;
        }
      }

      if (totalGps === 0) {
        gpsScore = 30;
        gpsDetails = 'No GPS data available for any measurements';
        gpsFindings.push({
          severity: 'warning',
          title: 'Missing GPS Data',
          description: 'None of the measurements have GPS coordinates attached.',
          recommendation: 'Ensure all site photos are taken with GPS-enabled cameras.',
        });
      } else {
        gpsScore = Math.round((validCount / totalGps) * 100);
        gpsDetails = `${validCount}/${totalGps} measurements within parcel boundary`;

        if (validCount < totalGps) {
          gpsFindings.push({
            severity: 'warning',
            title: 'GPS Location Mismatch',
            description: `${totalGps - validCount} measurement(s) recorded outside the registered parcel boundary.`,
            recommendation: 'Verify that measurements were taken at the correct project site.',
          });
        }

        if (spoofSuspicious > 0) {
          gpsFindings.push({
            severity: 'critical',
            title: 'GPS Spoofing Suspected',
            description: `${spoofSuspicious} measurement(s) show signs of GPS data manipulation.`,
            recommendation: 'Conduct physical site verification and cross-check with independent GPS readings.',
          });
          gpsScore = Math.max(10, gpsScore - 30);
        }
      }
    } else {
      gpsScore = 20;
      gpsDetails = 'Survey number not found in land registry — cannot validate GPS';
      gpsFindings.push({
        severity: 'critical',
        title: 'Registry Record Missing',
        description: `Survey number ${project.surveyNumber} not found in the land registry.`,
        recommendation: 'Verify survey number and ensure land records are up to date.',
      });
    }

    // ── Registry Verification ───────────────────────
    let registryScore = 0;
    let registryDetails = '';
    const registryFindings: AuditFinding[] = [];

    if (registryRecord) {
      registryScore = 85;
      registryDetails = `Verified: ${registryRecord.ownerName} — ${registryRecord.area} hectares in ${registryRecord.village}`;

      if (registryRecord.encumbrances.length > 0) {
        registryScore -= 20;
        registryFindings.push({
          severity: 'warning',
          title: 'Land Encumbrances Found',
          description: `Active encumbrances: ${registryRecord.encumbrances.join('; ')}`,
          recommendation: 'Obtain legal clearance before proceeding with construction.',
        });
      }

      const hasDispute = registryRecord.encumbrances.some(
        (e) => e.toLowerCase().includes('dispute') || e.toLowerCase().includes('litigation')
      );
      if (hasDispute) {
        registryScore -= 15;
        registryFindings.push({
          severity: 'critical',
          title: 'Active Legal Dispute',
          description: 'The land parcel has pending litigation or boundary disputes.',
          recommendation: 'Halt construction and obtain court clearance.',
        });
      }
    } else {
      registryScore = 10;
      registryDetails = 'Survey number not found in registry';
      registryFindings.push({
        severity: 'critical',
        title: 'Unverified Land Ownership',
        description: 'Cannot verify land ownership as the survey number was not found.',
        recommendation: 'Submit correct survey number or update land registry records.',
      });
    }

    // ── Measurement Accuracy ────────────────────────
    let measurementScore = 0;
    let measurementDetails = '';
    const measurementFindings: AuditFinding[] = [];

    if (measurements.length === 0) {
      measurementScore = 0;
      measurementDetails = 'No measurements recorded';
    } else {
      measurementScore = Math.round(summary.averageConfidence);
      measurementDetails = `${measurements.length} entries — ${summary.verifiedCount} verified, ${summary.aiEstimatedCount} AI-estimated`;

      if (summary.aiEstimatedCount > summary.verifiedCount) {
        measurementFindings.push({
          severity: 'warning',
          title: 'Majority AI-Estimated',
          description: `${summary.aiEstimatedCount} of ${measurements.length} measurements are AI-estimated and unverified.`,
          recommendation: 'Conduct physical verification of AI-estimated measurements.',
        });
      }

      const lowConfidence = measurements.filter((m) => m.confidenceScore < 60);
      if (lowConfidence.length > 0) {
        measurementFindings.push({
          severity: 'warning',
          title: 'Low Confidence Measurements',
          description: `${lowConfidence.length} measurement(s) have confidence scores below 60%.`,
          recommendation: 'Re-measure items with low confidence using manual methods.',
        });
      }

      // Check for unusually high amounts
      const avgAmount = summary.totalAmount / measurements.length;
      const highOutliers = measurements.filter((m) => m.amount > avgAmount * 5);
      if (highOutliers.length > 0) {
        measurementFindings.push({
          severity: 'info',
          title: 'High-Value Entries Detected',
          description: `${highOutliers.length} measurement(s) have amounts significantly above average.`,
          recommendation: 'Review high-value entries for accuracy and rate verification.',
        });
      }
    }

    // ── Overall Score ───────────────────────────────
    const overallScore = Math.round(
      gpsScore * 0.3 + registryScore * 0.3 + measurementScore * 0.4
    );

    // ── Recommendations ─────────────────────────────
    const recommendations: string[] = [];
    if (overallScore < 50) {
      recommendations.push('Immediate site inspection recommended — overall compliance is critically low.');
    }
    if (gpsScore < 60) {
      recommendations.push('Re-collect GPS data with higher accuracy equipment.');
    }
    if (registryScore < 70) {
      recommendations.push('Verify land ownership documentation and resolve encumbrances.');
    }
    if (measurementScore < 70) {
      recommendations.push('Schedule physical measurement verification by certified engineer.');
    }
    if (overallScore >= 80) {
      recommendations.push('Project is in good compliance standing. Continue regular monitoring.');
    }

    const allFindings = [...gpsFindings, ...registryFindings, ...measurementFindings];

    // Save the report
    const report = await AuditReportStore.create({
      projectId: project.id,
      type: 'comprehensive',
      overallScore,
      gpsValidation: { status: gpsScore >= 70 ? 'pass' : gpsScore >= 40 ? 'partial' : 'fail', score: gpsScore, details: gpsDetails },
      registryVerification: { status: registryScore >= 70 ? 'pass' : registryScore >= 40 ? 'partial' : 'fail', score: registryScore, details: registryDetails },
      measurementAccuracy: { status: measurementScore >= 70 ? 'pass' : measurementScore >= 40 ? 'partial' : 'fail', score: measurementScore, details: measurementDetails },
      findings: allFindings,
      recommendations,
      generatedBy: req.user?.username || 'system',
    });

    res.json(report);
  } catch (error) {
    console.error('Audit report error:', error);
    res.status(500).json({ message: 'Audit report generation failed' });
  }
});

export default router;
