import { Response } from 'express';
import { supabase } from '../database/supabase';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const listTodos = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const allowedStatuses = ['pending', 'ongoing', 'done'];

  // todo_date / status columns may not exist on older installs; fallback to smaller select.
  // IMPORTANT: Use `any[]` to avoid TS type mismatch between the two select shapes.
  let rawTodos: any[] = [];

  const primary = await supabase
    .from('user_todos')
    .select('id, title, created_at, todo_date, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!primary.error) {
    rawTodos = (primary.data as any[]) || [];
  } else {
    const fallback = await supabase
      .from('user_todos')
      .select('id, title, created_at, todo_date')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (fallback.error) return res.status(400).json({ error: fallback.error.message });
    rawTodos = (fallback.data as any[]) || [];
  }

  const todos = (rawTodos || []).map((t: any) => ({
    ...t,
    todo_date: t.todo_date ?? null,
    status: allowedStatuses.includes(t.status) ? t.status : 'pending',
  }));

  return res.status(200).json({ todos });
};

export const createTodo = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) return res.status(400).json({ error: 'title is required' });

  const todoDateRaw = typeof req.body?.todo_date === 'string' ? req.body.todo_date : undefined;
  const todoDate = todoDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(todoDateRaw) ? todoDateRaw : undefined;

  const allowedStatuses = ['pending', 'ongoing', 'done'];
  const statusRaw = typeof req.body?.status === 'string' ? req.body.status : undefined;
  const status = statusRaw && allowedStatuses.includes(statusRaw) ? statusRaw : 'pending';

  // Fallback: if `todo_date` column doesn't exist yet, still create todo.
  const insertPayload: any = { user_id: userId, title, status };
  if (todoDate) insertPayload.todo_date = todoDate;

  let { data, error } = await supabase
    .from('user_todos')
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    // fallback insert (older installs without todo_date/status)
    const fallback = await supabase
      .from('user_todos')
      .insert([{ user_id: userId, title }])
      .select()
      .single();
    if (fallback.error) return res.status(400).json({ error: fallback.error.message });
    data = fallback.data;
  }

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

export const updateTodoStatus = async (req: AuthenticatedRequest, res: Response): Promise<any> => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'id required' });

  const allowedStatuses = ['pending', 'ongoing', 'done'];
  const statusRaw = typeof req.body?.status === 'string' ? req.body.status : '';
  const status = allowedStatuses.includes(statusRaw) ? statusRaw : null;
  if (!status) return res.status(400).json({ error: 'status must be pending/ongoing/done' });

  const { data, error } = await supabase
    .from('user_todos')
    .update({ status })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ todo: data });
};
