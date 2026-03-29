-- Daily-KHATA Supabase Schema (PostgreSQL)
-- Drop existing objects to allow clean re-runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.udhar_transactions CASCADE;
DROP TABLE IF EXISTS public.parties CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;

-- 0. Admins Table
CREATE TABLE public.admins (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'super_admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view own row" ON public.admins FOR SELECT USING (auth.uid() = id);

-- 1. Profiles Table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'premium_mon', 'premium_yr', 'premium_life'
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins bypass RLS profiles" ON public.profiles FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Trigger to automatically create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'User'), new.phone);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Categories Table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means Global Base Category
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,    
  color TEXT,   
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read base categories and own custom categories" ON public.categories FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins bypass RLS categories" ON public.categories FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

INSERT INTO public.categories (name, type, icon, color) VALUES 
('Salary', 'income', 'Briefcase', '#22c55e'),
('Business', 'income', 'Store', '#3b82f6'),
('Food', 'expense', 'Utensils', '#f97316'),
('Travel', 'expense', 'Bus', '#eab308'),
('Shopping', 'expense', 'ShoppingBag', '#ec4899'),
('Bills', 'expense', 'Receipt', '#ef4444'),
('Health', 'expense', 'HeartPulse', '#14b8a6');

-- 4. Udhar Parties
CREATE TABLE public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  reminder_frequency INTEGER DEFAULT 0, -- 0: None, 1: Daily 1x, 2: Daily 2x, 3: Daily 3x
  reminder_start_date TIMESTAMP WITH TIME ZONE,
  last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
  reminders_sent_today INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can do ALL on own parties" ON public.parties FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins bypass RLS parties" ON public.parties FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 3. Transactions Table (Income & Expense) modified to link to Parties
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL, -- UNIFIED UDHAR LINKAGE
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount DECIMAL(12,2) NOT NULL,
  note TEXT,
  receipt_url TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can do ALL on own transactions" ON public.transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins bypass RLS transactions" ON public.transactions FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 5. Udhar Transactions
CREATE TABLE public.udhar_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES public.parties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('given', 'taken')),
  note TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.udhar_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can do ALL on own udhar_transactions" ON public.udhar_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins bypass RLS udhar_transactions" ON public.udhar_transactions FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- 6. Notifications Table (Admin Push Alerts)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT, 
  target_tier TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Admins bypass RLS notifications" ON public.notifications FOR ALL USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));
