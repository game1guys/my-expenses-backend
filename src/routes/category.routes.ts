import { Router } from 'express';
import { getCategories, createCustomCategory } from '../controllers/category.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();

router.get('/', requireAuth, getCategories);
router.post('/custom', requireAuth, upload.single('image'), createCustomCategory);

export default router;
