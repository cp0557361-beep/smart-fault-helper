
ALTER TABLE public.machine_types 
ADD COLUMN default_line_order integer DEFAULT 0;

UPDATE public.machine_types SET default_line_order = sequence_order;
