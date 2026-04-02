import { Response } from 'express';
import { supabase } from '../database/supabase';
import { createSupabaseForUser } from '../database/supabaseUserClient';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

/**
 * Current user profile + subscription (Mobile “Me” screen).
 */
export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const user = req.user;
  if (!user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const meta = user.user_metadata || {};

  const sb = createSupabaseForUser(accessToken);
  const { data: profile, error } = await sb
    .from('profiles')
    .select('full_name, phone, subscription_tier, subscription_end_date, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({
    user: {
      id: user.id,
      email: user.email ?? null,
      full_name: profile?.full_name ?? meta.full_name ?? 'User',
      phone: profile?.phone ?? meta.phone ?? null,
    },
    subscription: {
      tier: profile?.subscription_tier ?? 'free',
      end_date: profile?.subscription_end_date ?? null,
    },
    member_since: profile?.created_at ?? user.created_at ?? null,
  });
};

/**
 * Update user profile (Name and Phone only).
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const user = req.user;
  if (!user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { full_name, phone, fcm_token } = req.body;

  const updateData: any = {};
  if (full_name !== undefined) updateData.full_name = full_name;
  if (phone !== undefined) updateData.phone = phone;
  if (fcm_token !== undefined) updateData.fcm_token = fcm_token;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'At least one field (full_name, phone, or fcm_token) must be provided' });
  }

  const accessToken = req.headers.authorization?.split(' ')[1];
  if (!accessToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const sb = createSupabaseForUser(accessToken);
  const { data, error } = await sb
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Update Profile DB Error:', error);
    return res.status(400).json({ error: error.message });
  }

  // Sync name/phone to auth metadata (needs service role — optional)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const meta: Record<string, unknown> = { ...user.user_metadata };
      if (full_name !== undefined) meta.full_name = full_name;
      if (phone !== undefined) meta.phone = phone;
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: meta,
      });
    } catch (authErr) {
      console.warn('Auth metadata sync skipped:', authErr);
    }
  }

  return res.status(200).json({
    message: 'Profile updated successfully',
    user: {
      id: user.id,
      email: user.email,
      full_name: data.full_name,
      phone: data.phone,
    },
  });
};
