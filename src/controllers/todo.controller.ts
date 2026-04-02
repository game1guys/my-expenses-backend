import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const listTodos = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { data, error } = await supabase
    .from('user_todos')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ todos: data || [] });
};

export const createTodo = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });

  const { data, error } = await supabase
    .from('user_todos')
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ todo: data });
};

/** Mark done = remove row */
export const deleteTodo = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id required' });

  const { error } = await supabase.from('user_todos').delete().eq('id', id).eq('user_id', userId);

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ ok: true });
};
