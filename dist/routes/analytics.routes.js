"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Protect ALL analytics routes to ensure users only pull their own aggregated metrics
router.use(auth_middleware_1.requireAuth);
router.get('/monthly-bar', analytics_controller_1.getMonthlyBarGraph);
router.get('/weekly-trend', analytics_controller_1.getWeeklyTrends);
router.get('/compare-days', analytics_controller_1.compareDates);
router.get('/category-chart', analytics_controller_1.getCategoryDistribution);
exports.default = router;
