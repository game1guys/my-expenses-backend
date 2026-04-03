import { Request, Response } from 'express';
import { supabase } from '../database/supabase';
import { sendOtpEmail } from '../services/email.service';

// In-memory OTP store — { email: { otp, userId, expiresAt } }
const otpStore = new Map<string, { otp: string; userId: string; expiresAt: number }>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const EMAIL_SEND_DEADLINE_MS = 28_000;

export const sendForgotPasswordOtp = async (req: Request, res: Response): Promise<any> => {
  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  if (!process.env.SMTP_USER?.trim() || !process.env.SMTP_PASS?.trim()) {
    console.error('[ForgotPassword] SMTP_USER / SMTP_PASS missing — cannot send OTP');
    return res.status(503).json({
      error: 'Password reset email is not configured on the server. Add SMTP_USER and SMTP_PASS to the backend environment.',
    });
  }

  // Look up user by email via admin API
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return res.status(500).json({ error: 'Could not verify email.' });

  const user = data?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    // Return success anyway to prevent email enumeration
    return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
  }

  const otp = generateOtp();
  otpStore.set(email, { otp, userId: user.id, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    await Promise.race([
      sendOtpEmail(email, otp),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('EMAIL_SEND_TIMEOUT')), EMAIL_SEND_DEADLINE_MS),
      ),
    ]);
  } catch (e) {
    otpStore.delete(email);
    console.error('[ForgotPassword] Email send failed:', e);
    const timedOut = e instanceof Error && e.message === 'EMAIL_SEND_TIMEOUT';
    return res.status(500).json({
      error: timedOut
        ? 'Sending the email took too long. Check SMTP settings and try again.'
        : 'Failed to send OTP email. Please try again.',
    });
  }

  return res.status(200).json({ message: 'If this email is registered, an OTP has been sent.' });
};

export const resetPasswordWithOtp = async (req: Request, res: Response): Promise<any> => {
  const email = (req.body?.email || '').trim().toLowerCase();
  const otp = (req.body?.otp || '').trim();
  const newPassword = req.body?.newPassword || '';

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const record = otpStore.get(email);
  if (!record) return res.status(400).json({ error: 'OTP not found or already used. Please request a new one.' });
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== otp) {
    return res.status(400).json({ error: 'Incorrect OTP. Please check and try again.' });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(record.userId, { password: newPassword });
  if (updateError) return res.status(500).json({ error: updateError.message });

  otpStore.delete(email);
  return res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });
};

export const registerUser = async (req: Request, res: Response): Promise<any> => {
  const { email, password, full_name, phone } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
      },
    },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(201).json({ message: 'User registered successfully', data });
};

export const loginUser = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  // Inject Profile metadata (specifically the subscription tier) for the User Client
  const { data: profileData } = await supabase
     .from('profiles')
     .select('full_name, phone, subscription_tier, subscription_end_date')
     .eq('id', data.session?.user.id)
     .single();

  return res.status(200).json({ 
    message: 'Login successful', 
    session: data.session,
    profile: profileData || { subscription_tier: 'free' }
  });
};

export const googleLoginUser = async (req: Request, res: Response): Promise<any> => {
  const { id_token } = req.body;
  if (!id_token) {
    return res.status(400).json({ error: 'Missing native Google id_token from device payload' });
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: id_token,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  // Inject Profile metadata (specifically the subscription tier) for the User Client
  const { data: profileData } = await supabase
     .from('profiles')
     .select('full_name, phone, subscription_tier, subscription_end_date')
     .eq('id', data.session?.user.id)
     .single();

  return res.status(200).json({ 
    message: 'Google login successful', 
    session: data.session,
    profile: profileData || { subscription_tier: 'free' }
  });
};
