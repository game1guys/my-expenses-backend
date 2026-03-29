import { Router } from 'express';
import { registerUser, loginUser, googleLoginUser } from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLoginUser);

export default router;
