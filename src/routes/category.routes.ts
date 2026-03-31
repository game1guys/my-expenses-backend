import { Router } from 'express';
import { getCategories, createCustomCategory, updateCategoryBudget, setMonthlyBudget } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', requireAuth, getCategories);
router.post('/custom', requireAuth, upload.single('image'), createCustomCategory);
router.put('/:id/budget', requireAuth, updateCategoryBudget);
router.post('/set-monthly-budget', requireAuth, setMonthlyBudget);
router.post('/update-budget', requireAuth, setMonthlyBudget); // Even simpler route

export default router;
