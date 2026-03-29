import { Request, Response } from 'express';
import { supabase } from '../database/supabase';

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
