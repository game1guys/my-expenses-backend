import { Router } from 'express';
import { createUser, getSystemPulseLeaders, getAdminCoreData, getAdminUserLedger, getPaginatedUsers, getPaginatedNotifications } from '../controllers/admin.controller';

const router = Router();

// Endpoint for Admin to automatically generate an internal User Node
router.post('/users', createUser);

// Analytical Pipeline exposing Global Node Leaders
router.get('/pulse-leaders', getSystemPulseLeaders);

// Bypassed Full Matrix Pull for User Dashboard Display
router.get('/core-data', getAdminCoreData);

// Specific Node Ledger Inspect Override
router.get('/ledger/:targetUserId', getAdminUserLedger);

// Absolute Paginated Bulk Fetchers
router.get('/users-paginated', getPaginatedUsers);
router.get('/notifications-paginated', getPaginatedNotifications);

export default router;
