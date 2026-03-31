import { Request, Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { StorageService } from '../services/storage.service';

export const getCategories = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;

  // Fetch global base categories (user_id IS NULL) and user-specific custom categories
  const { data: cats, error: catError } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${userId}`);

  if (catError) {
    return res.status(400).json({ error: catError.message });
  }

  // If month_year is provided, fetch budgets for that month
  const { month_year } = req.query;
  let budgets: any[] = [];
  if (month_year) {
    const { data: budgetData } = await supabase
      .from('category_budgets')
      .select('category_id, amount')
      .eq('user_id', userId)
      .eq('month_year', month_year);
    budgets = budgetData || [];
  }

  // Merge budgets into categories
  const categories = cats.map(c => {
    const b = budgets.find(b => b.category_id === c.id);
    return { ...c, monthly_budget: b ? b.amount : null };
  });

  return res.status(200).json({ categories });
};

export const createCustomCategory = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    const { name, type, icon, color, monthly_budget } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    let icon_url = null;
    if (req.file) {
      try {
        icon_url = await StorageService.uploadFile('category-icons', String(userId), req.file);
      } catch (err: any) {
        console.error('Category icon upload failed:', err);
        return res.status(400).json({ error: `Image upload failed: ${err.message}` });
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
        icon_url,
        monthly_budget: monthly_budget ? Number(monthly_budget) : null
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

export const updateCategoryBudget = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  const { id } = req.params;
  const { monthly_budget, month_year } = req.body;

  if (monthly_budget === undefined || !month_year) {
    return res.status(400).json({ error: 'monthly_budget and month_year are required' });
  }

  // month_year format: "YYYY-MM"
  const { data, error } = await supabase
    .from('category_budgets')
    .upsert({ 
      user_id: userId, 
      category_id: id, 
      month_year, 
      amount: Number(monthly_budget) 
    }, { onConflict: 'user_id,category_id,month_year' })
    .select()
    .single();

  if (error) {
    console.error('Update Category Budget DB Error:', error);
    return res.status(400).json({ error: error.message });
  }

  return res.status(200).json({ budget: data });
};
