import { Router } from 'express';
import { getCategories, createCustomCategory } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', requireAuth, getCategories);
router.post('/custom', requireAuth, createCustomCategory);

export default router;
