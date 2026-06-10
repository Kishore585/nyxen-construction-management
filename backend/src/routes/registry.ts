/**
 * Land Registry Routes
 * GET /api/registry/search — Search land registry by survey number
 */

import { Router, Request, Response } from 'express';
import { MOCK_REGISTRY } from '../data/mockRegistry';

const router = Router();

/**
 * GET /api/registry/search
 * Query: ?surveyNumber=SY-45/1&district=&state=
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const { surveyNumber, district, state } = req.query;

    if (!surveyNumber || typeof surveyNumber !== 'string') {
      res.status(400).json({ message: 'surveyNumber query parameter is required' });
      return;
    }

    // Search by survey number, village, owner, district, taluk, or landUse (partial match)
    let results = MOCK_REGISTRY.filter((r) => {
      const q = surveyNumber.toLowerCase();
      return (
        r.surveyNumber.toLowerCase().includes(q) ||
        r.village.toLowerCase().includes(q) ||
        r.ownerName.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.taluk.toLowerCase().includes(q) ||
        r.landUse.toLowerCase().includes(q)
      );
    });

    // Filter by district if provided
    if (district && typeof district === 'string') {
      results = results.filter((r) =>
        r.district.toLowerCase().includes(district.toLowerCase())
      );
    }

    // Filter by state if provided
    if (state && typeof state === 'string') {
      results = results.filter((r) =>
        r.state.toLowerCase().includes(state.toLowerCase())
      );
    }

    if (results.length === 0) {
      res.json({
        found: false,
        message: 'No matching land registry entries found',
        results: [],
      });
      return;
    }

    // Return full registry data including boundaries
    const enriched = results.map((r) => ({
      surveyNumber: r.surveyNumber,
      state: r.state,
      district: r.district,
      taluk: r.taluk,
      village: r.village,
      ownerName: r.ownerName,
      areaHectares: r.area,
      areaSqm: Math.round(r.area * 10000),
      landUse: r.landUse,
      encumbrances: r.encumbrances,
      registrationDate: r.registrationDate,
      ulpin: r.ulpin,
      boundaryPolygon: r.boundaryPolygon,
      hasDisputes: r.encumbrances.some(
        (e) => e.toLowerCase().includes('dispute') || e.toLowerCase().includes('litigation')
      ),
    }));

    res.json({
      found: true,
      count: enriched.length,
      results: enriched,
    });
  } catch (error) {
    console.error('Registry search error:', error);
    res.status(500).json({ message: 'Registry search failed' });
  }
});

export default router;
