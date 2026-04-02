import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const listTodos = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // todo_date column may not exist on older installs; fallback to old select.
  const { data, error } = await supabase
    .from('user_todos')
    .select('id, title, created_at, todo_date')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error) {
    return res.status(200).json({ todos: (data || []) as any[] });
  }

  {
    const { data: data2, error: error2 } = await supabase
      .from('user_todos')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error2) return res.status(400).json({ error: error2.message });
    const todos = (data2 || []).map((t: any) => ({ ...t, todo_date: t.todo_date ?? null }));
    return res.status(200).json({ todos });
  }
};

export const createTodo = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });

  const todoDateRaw = typeof req.body?.todo_date === 'string' ? req.body.todo_date : undefined;
  const todoDate = todoDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(todoDateRaw) ? todoDateRaw : undefined;

  // Fallback: if `todo_date` column doesn't exist yet, still create todo.
  let insertPayload = [{ user_id: userId, title, ...(todoDate ? { todo_date: todoDate } : {}) }];
  let { data, error } = await supabase
    .from('user_todos')
    .insert(insertPayload)
    .select()
    .single();

  if (error && todoDate) {
    const { data: data2, error: error2 } = await supabase
      .from('user_todos')
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    if (!error2) data = data2;
    else return res.status(400).json({ error: error2.message });
  }

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
