/**
 * Nyxen Routes
 * GET  /api/nyxen/:projectId             — Get Nyxen for project
 * PUT  /api/nyxen/:projectId/entries/:id — Update entry
 * GET  /api/nyxen/:projectId/export      — Export as JSON/CSV
 */

import { Router, Request, Response } from 'express';
import { MeasurementStore } from '../models/Measurement';
import { ProjectStore } from '../models/Project';

const router = Router();

/**
 * GET /api/nyxen/:projectId
 */
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const project = await ProjectStore.getById(req.params.projectId);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const measurements = await MeasurementStore.getByProjectId(req.params.projectId);
    const summary = await MeasurementStore.getProjectSummary(req.params.projectId);

    res.json({
      project: {
        id: project.id,
        name: project.name,
        contractor: project.contractor,
        engineer: project.engineer,
        location: project.location,
        surveyNumber: project.surveyNumber,
      },
      measurements,
      summary,
    });
  } catch (error) {
    console.error('Error fetching Nyxen:', error);
    res.status(500).json({ message: 'Failed to fetch Nyxen' });
  }
});

/**
 * PUT /api/nyxen/:projectId/entries/:entryId
 * Role restrictions:
 *  - Admin, Engineer, Jr. Engineer: update any field
 *  - Supervisor: update only 'remarks'
 *  - Auditor: 403 Forbidden
 */
router.put('/:projectId/entries/:entryId', async (req: Request, res: Response) => {
  try {
    const userRole = (req.user?.role || '').toLowerCase();

    // Auditor cannot modify anything
    if (userRole === 'auditor') {
      res.status(403).json({ message: 'Access denied — Auditors have read-only access' });
      return;
    }

    // Supervisor can only update the 'remarks' field
    if (userRole === 'supervisor') {
      const allowedFields = ['remarks'];
      const attemptedFields = Object.keys(req.body);
      const disallowed = attemptedFields.filter((f) => !allowedFields.includes(f));

      if (disallowed.length > 0) {
        res.status(403).json({
          message: `Access denied — Supervisors can only update remarks. Disallowed fields: ${disallowed.join(', ')}`,
        });
        return;
      }
    }

    const updated = await MeasurementStore.update(req.params.entryId, req.body);
    if (!updated) {
      res.status(404).json({ message: 'Measurement entry not found' });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error('Error updating entry:', error);
    res.status(500).json({ message: 'Failed to update entry' });
  }
});

/**
 * GET /api/nyxen/:projectId/export
 * Query: ?format=json|csv
 */
router.get('/:projectId/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'json';
    const measurements = await MeasurementStore.getByProjectId(req.params.projectId);
    const project = await ProjectStore.getById(req.params.projectId);

    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    if (format === 'csv') {
      const headers = [
        'S.No', 'Item Code', 'Description', 'Category', 'Location',
        'Number', 'Length', 'Breadth', 'Depth', 'Quantity', 'Unit',
        'Rate', 'Amount', 'Confidence', 'Source',
      ];

      const rows = measurements.map((m, i) =>
        [
          i + 1, m.itemCode, `"${m.description}"`, m.category, `"${m.location}"`,
          m.number, m.length, m.breadth, m.depth, m.quantity, m.unit,
          m.rate, m.amount, m.confidenceScore, m.source,
        ].join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Nyxen_${project.name.replace(/\s+/g, '_')}.csv"`
      );
      res.send(csv);
    } else {
      res.json({
        project: {
          name: project.name,
          surveyNumber: project.surveyNumber,
          contractor: project.contractor,
          engineer: project.engineer,
        },
        measurements,
        exportedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
});

export default router;
