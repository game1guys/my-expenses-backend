-- Run once in Supabase SQL editor if push / FCM token never saves on profile update
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fcm_token text;

COMMENT ON COLUMN public.profiles.fcm_token IS 'FCM device token for admin push notifications';
