import { Router } from 'express';
import { getCategories, createCustomCategory, updateCategoryBudget } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', requireAuth, getCategories);
router.post('/custom', requireAuth, upload.single('image'), createCustomCategory);
router.put('/:id/budget', requireAuth, updateCategoryBudget);

export default router;
