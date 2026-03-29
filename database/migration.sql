-- Migration SQL to update schema without erasing data
-- Run these statements in Supabase SQL Editor

-- 1. Update Profiles table for Subscriptions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_tier') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='subscription_end_date') THEN
        ALTER TABLE public.profiles ADD COLUMN subscription_end_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Update Parties table for Email Reminders
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parties' AND column_name='email') THEN
        ALTER TABLE public.parties ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parties' AND column_name='reminder_frequency') THEN
        ALTER TABLE public.parties ADD COLUMN reminder_frequency INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parties' AND column_name='reminder_start_date') THEN
        ALTER TABLE public.parties ADD COLUMN reminder_start_date TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parties' AND column_name='last_reminder_sent_at') THEN
        ALTER TABLE public.parties ADD COLUMN last_reminder_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parties' AND column_name='reminders_sent_today') THEN
        ALTER TABLE public.parties ADD COLUMN reminders_sent_today INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Update Transactions table for Party Linkage (if not already there)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='party_id') THEN
        ALTER TABLE public.transactions ADD COLUMN party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL;
    END IF;
END $$;
