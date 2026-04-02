-- Run in Supabase SQL editor
CREATE TABLE IF NOT EXISTS public.user_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_todos_user_created ON public.user_todos (user_id, created_at DESC);

ALTER TABLE public.user_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own todos" ON public.user_todos;
CREATE POLICY "Users manage own todos"
  ON public.user_todos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_todos IS 'Simple per-user todo items; deleting a row means done.';
