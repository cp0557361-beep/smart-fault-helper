-- Add sequences array to machine_types (suggested sequences for the type)
ALTER TABLE public.machine_types
ADD COLUMN sequences text[] DEFAULT '{}';

-- Add sequences array to machines (actual sequences assigned to the machine instance)
ALTER TABLE public.machines
ADD COLUMN sequences text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.machine_types.sequences IS 'Suggested sequence identifiers for this machine type (e.g., 50, 50-1, 50-3)';
COMMENT ON COLUMN public.machines.sequences IS 'Actual sequence identifiers assigned to this machine instance';