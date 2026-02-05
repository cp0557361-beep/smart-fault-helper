-- Add sequence_order column to machine_types for drag & drop ordering
ALTER TABLE public.machine_types
ADD COLUMN IF NOT EXISTS sequence_order integer DEFAULT 0;

-- Update existing machine types with initial ordering based on name
WITH ordered_types AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as new_order
  FROM public.machine_types
)
UPDATE public.machine_types
SET sequence_order = ordered_types.new_order
FROM ordered_types
WHERE public.machine_types.id = ordered_types.id;