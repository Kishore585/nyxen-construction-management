/**
 * Project Routes
 * GET  /api/projects      — List all projects
 * GET  /api/projects/:id  — Get project by ID
 * POST /api/projects      — Create new project
 */

import { Router, Request, Response } from 'express';
import { ProjectStore } from '../models/Project';
import { MeasurementStore } from '../models/Measurement';

const router = Router();

/**
 * GET /api/projects
 * Optional query: ?status=in-progress
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    let projects;
    if (status && typeof status === 'string') {
      projects = await ProjectStore.getByStatus(status as any);
    } else {
      projects = await ProjectStore.getAll();
    }

    // Enrich with summary data
    const enriched = await Promise.all(
      projects.map(async (p) => {
        const summary = await MeasurementStore.getProjectSummary(p.id);
        return {
          ...p,
          measurementCount: summary.totalMeasurements,
          totalSpent: summary.totalAmount,
          averageConfidence: Math.round(summary.averageConfidence),
          verifiedCount: summary.verifiedCount,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/projects/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await ProjectStore.getById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const summary = await MeasurementStore.getProjectSummary(project.id);
    const measurements = await MeasurementStore.getByProjectId(project.id);

    res.json({
      ...project,
      summary,
      measurements,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

/**
 * POST /api/projects
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const project = await ProjectStore.create(req.body);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

export default router;
