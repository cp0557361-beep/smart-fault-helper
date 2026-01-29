-- Add image_url column to machines table for equipment photos
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS image_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.machines.image_url IS 'URL to equipment photo stored in Supabase storage';