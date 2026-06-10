/**
 * Dashboard Routes
 * GET /api/dashboard/stats — Aggregate dashboard statistics
 */

import { Router, Request, Response } from 'express';
import { ProjectStore } from '../models/Project';
import { MeasurementStore } from '../models/Measurement';
import { AuditReportStore } from '../models/AuditReport';

const router = Router();

/**
 * GET /api/dashboard/stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const projects = await ProjectStore.getAll();
    const allMeasurements = await MeasurementStore.getAll();
    const auditStats = await AuditReportStore.getOverallStats();

    // Project summary
    const activeProjects = projects.filter((p) => p.status === 'in-progress').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;
    const planningProjects = projects.filter((p) => p.status === 'planning').length;

    // Financial summary
    const totalBudget = projects.reduce((s, p) => s + p.totalBudget, 0);
    const totalSpent = allMeasurements.reduce((s, m) => s + m.amount, 0);

    // Measurement summary
    const verifiedMeasurements = allMeasurements.filter((m) => m.source === 'verified').length;
    const aiEstimated = allMeasurements.filter((m) => m.source === 'ai-estimated').length;
    const avgConfidence =
      allMeasurements.length > 0
        ? allMeasurements.reduce((s, m) => s + m.confidenceScore, 0) / allMeasurements.length
        : 0;

    // Category distribution
    const categoryDist: Record<string, { count: number; amount: number }> = {};
    for (const m of allMeasurements) {
      if (!categoryDist[m.category]) {
        categoryDist[m.category] = { count: 0, amount: 0 };
      }
      categoryDist[m.category].count++;
      categoryDist[m.category].amount += m.amount;
    }

    // Per-project summary
    const projectSummaries = await Promise.all(
      projects.map(async (p) => {
        const summary = await MeasurementStore.getProjectSummary(p.id);
        return {
          id: p.id,
          name: p.name,
          location: p.location.address,
          status: p.status,
          budget: p.totalBudget,
          spent: summary.totalAmount,
          progress: Math.min(100, Math.round((summary.totalAmount / p.totalBudget) * 100)),
          complianceScore: Math.round(summary.averageConfidence),
          measurementCount: summary.totalMeasurements,
          verifiedCount: summary.verifiedCount,
        };
      })
    );

    // Recent activity (last 10 measurements sorted by date)
    const recentActivity = [...allMeasurements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((m) => {
        const project = projects.find((p) => p.id === m.projectId);
        return {
          id: m.id,
          type: m.source === 'ai-estimated' ? 'ai-analysis' : 'measurement',
          title: `${m.category.charAt(0).toUpperCase() + m.category.slice(1)} — ${m.description.substring(0, 60)}...`,
          project: project?.name || 'Unknown',
          amount: m.amount,
          timestamp: m.createdAt,
        };
      });

    res.json({
      projects: {
        total: projects.length,
        active: activeProjects,
        completed: completedProjects,
        planning: planningProjects,
      },
      financial: {
        totalBudget,
        totalSpent,
        utilizationPercent: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
      measurements: {
        total: allMeasurements.length,
        verified: verifiedMeasurements,
        aiEstimated,
        averageConfidence: Math.round(avgConfidence),
      },
      audit: auditStats,
      categoryDistribution: categoryDist,
      projectSummaries,
      recentActivity,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

export default router;
