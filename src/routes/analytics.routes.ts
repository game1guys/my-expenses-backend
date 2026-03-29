import { Router } from 'express';
import {
  getMonthlyBarGraph,
  getWeeklyTrends,
  compareDates,
  getCategoryDistribution,
  getSpendingOverview,
} from '../controllers/analytics.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Protect ALL analytics routes to ensure users only pull their own aggregated metrics
router.use(requireAuth);

router.get('/monthly-bar', getMonthlyBarGraph);
router.get('/weekly-trend', getWeeklyTrends);
router.get('/compare-days', compareDates);
router.get('/category-chart', getCategoryDistribution);
router.get('/overview', getSpendingOverview);

export default router;
