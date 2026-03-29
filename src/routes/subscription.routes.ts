import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/subscription.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/create-order', requireAuth, createOrder);
router.post('/verify-payment', requireAuth, verifyPayment);

export default router;
