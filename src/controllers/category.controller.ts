import { Request, Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { StorageService } from '../services/storage.service';

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
  try {
    const userId = req.user?.id;
    const { name, type, icon, color } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    let icon_url = null;
    if (req.file) {
      try {
        icon_url = await StorageService.uploadFile('category-icons', String(userId), req.file);
      } catch (err) {
        console.error('Category icon upload failed:', err);
      }
    }

    const { data, error } = await supabase
      .from('categories')
      .insert([{
        user_id: userId,
        name,
        type,
        icon: icon || 'Circle',
        color: color || '#aaaaaa',
        icon_url
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({ category: data });
  } catch (err: any) {
    console.error('Create Category Error:', err);
    return res.status(500).json({ error: err.message || 'Server side error' });
  }
};
