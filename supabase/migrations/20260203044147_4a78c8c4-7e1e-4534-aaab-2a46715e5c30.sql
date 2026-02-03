-- Create independent machine_types table
CREATE TABLE public.machine_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machine_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view machine types"
ON public.machine_types FOR SELECT
USING (true);

CREATE POLICY "Only admins can insert machine types"
ON public.machine_types FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Only admins can update machine types"
ON public.machine_types FOR UPDATE
USING (is_admin());

CREATE POLICY "Only admins can delete machine types"
ON public.machine_types FOR DELETE
USING (is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_machine_types_updated_at
BEFORE UPDATE ON public.machine_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing types from templates
INSERT INTO public.machine_types (name)
SELECT DISTINCT machine_type FROM public.machine_section_templates
ON CONFLICT (name) DO NOTHING;