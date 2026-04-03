import { Router } from 'express';
import {
  registerUser,
  loginUser,
  googleLoginUser,
  sendForgotPasswordOtp,
  resetPasswordWithOtp,
} from '../controllers/auth.controller';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLoginUser);
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);

export default router;
