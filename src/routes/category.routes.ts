import { Router } from 'express';
import { getCategories, createCustomCategory, updateCategoryBudget, setMonthlyBudget } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', requireAuth, getCategories);
router.post('/custom', requireAuth, upload.single('image'), createCustomCategory);
router.put('/:id/budget', requireAuth, updateCategoryBudget);
// Alias (some clients use POST for budget updates)
router.post('/:id/budget', requireAuth, updateCategoryBudget);
router.post('/set-monthly-budget', requireAuth, setMonthlyBudget);
router.post('/update-budget', requireAuth, setMonthlyBudget);
router.put('/update-budget', requireAuth, setMonthlyBudget); // Add PUT as well
router.post('/update', requireAuth, setMonthlyBudget); // Even shorter route just in case

export default router;
