import { Request, Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getCategories = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;

  // Fetch global base categories (user_id IS NULL) and user-specific custom categories
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ categories: data });
};

export const createCustomCategory = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([{
      user_id: userId,
      name,
      type,
      icon: icon || 'Circle',
      color: color || '#aaaaaa'
    }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.status(201).json({ category: data });
};
