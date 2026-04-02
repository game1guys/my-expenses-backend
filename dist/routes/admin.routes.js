"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// Endpoint for Admin to automatically generate an internal User Node
router.post('/users', admin_controller_1.createUser);
router.get('/promo-codes', admin_controller_1.listPromoCodes);
router.post('/promo-codes', admin_controller_1.createPromoCode);
router.patch('/promo-codes/:id', admin_controller_1.updatePromoCode);
// Analytical Pipeline exposing Global Node Leaders
router.get('/pulse-leaders', admin_controller_1.getSystemPulseLeaders);
// Bypassed Full Matrix Pull for User Dashboard Display
router.get('/core-data', admin_controller_1.getAdminCoreData);
// Specific Node Ledger Inspect Override
router.get('/ledger/:targetUserId', admin_controller_1.getAdminUserLedger);
// Absolute Paginated Bulk Fetchers
router.get('/users-paginated', admin_controller_1.getPaginatedUsers);
router.get('/notifications-paginated', admin_controller_1.getPaginatedNotifications);
router.post('/notifications/broadcast', admin_controller_1.broadcastNotification);
exports.default = router;
