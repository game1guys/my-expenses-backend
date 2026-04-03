import { Request, Response } from 'express';
import { supabase } from '../database/supabase';
import { sendOtpEmail } from '../services/email.service';

const forgotOtpStore = new Map<string, { otp: string; userId: string; expiresAt: number }>();
const OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_SEND_MS = 60_000;

function smtpFailureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/EMAIL_TIMEOUT/i.test(raw)) {
    return 'Sending email took too long. Try again in a minute.';
  }
  if (/Invalid login|535|534|Authentication failed|BadCredentials/i.test(raw)) {
    return 'Could not send OTP email: mail login failed. For Gmail use an App Password and port 587.';
  }
  if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ECONNECTION/i.test(raw)) {
    return 'Could not reach the mail server. Check SMTP host/port on the server.';
  }
  return 'Could not send OTP email. Please try again.';
}

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

export const sendForgotPasswordOtp = async (req: Request, res: Response): Promise<any> => {
  const emailRaw = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return res.status(400).json({ error: 'Valid email is required' });
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(503).json({ error: 'Email service is not configured' });
  }

  const generic = {
    message: 'If an account exists for this email, you will receive an OTP shortly.',
  };

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: emailRaw,
  });

  if (linkError) {
    console.error('generateLink recovery', linkError.message);
  }

  const userId = linkData?.user?.id;
  const otp = linkData?.properties?.email_otp;
  if (linkError || !userId || !otp) {
    return res.status(200).json(generic);
  }

  forgotOtpStore.set(emailRaw, { otp, userId, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await Promise.race([
      sendOtpEmail(emailRaw, otp),
      new Promise<never>((_, rej) => {
        setTimeout(() => rej(new Error('EMAIL_TIMEOUT')), EMAIL_SEND_MS);
      }),
    ]);
    return res.status(200).json(generic);
  } catch (e) {
    forgotOtpStore.delete(emailRaw);
    console.error('sendForgotPasswordOtp email', e);
    return res.status(503).json({ error: smtpFailureMessage(e) });
  }
};

export const resetPasswordWithOtp = async (req: Request, res: Response): Promise<any> => {
  const emailRaw = String(req.body?.email || '')
    .trim()
    .toLowerCase();
  const otp = String(req.body?.otp || '').trim();
  const newPassword = req.body?.newPassword;

  if (!emailRaw || !otp || typeof newPassword !== 'string' || !newPassword) {
    return res.status(400).json({ error: 'Email, OTP, and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/^\d{6,12}$/.test(otp)) {
    return res.status(400).json({ error: 'Enter the OTP from your email (digits only).' });
  }

  const row = forgotOtpStore.get(emailRaw);
  if (!row || row.expiresAt < Date.now()) {
    forgotOtpStore.delete(emailRaw);
    return res.status(400).json({ error: 'Invalid or expired OTP. Request a new one.' });
  }
  if (row.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  const { error } = await supabase.auth.admin.updateUserById(row.userId, { password: newPassword });
  forgotOtpStore.delete(emailRaw);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json({ message: 'Password updated. You can sign in now.' });
};
