
-- 1. Line categories table (e.g., Placement, Backend, Inspección)
CREATE TABLE public.line_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sequence_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.line_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view line categories" ON public.line_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert line categories" ON public.line_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Only admins can update line categories" ON public.line_categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Only admins can delete line categories" ON public.line_categories FOR DELETE TO authenticated USING (is_admin());

-- 2. Junction table: machine types <-> line categories (many-to-many)
CREATE TABLE public.machine_type_line_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_type_id uuid NOT NULL REFERENCES public.machine_types(id) ON DELETE CASCADE,
  line_category_id uuid NOT NULL REFERENCES public.line_categories(id) ON DELETE CASCADE,
  sequence_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(machine_type_id, line_category_id)
);

ALTER TABLE public.machine_type_line_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view machine type line categories" ON public.machine_type_line_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert machine type line categories" ON public.machine_type_line_categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "Only admins can update machine type line categories" ON public.machine_type_line_categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "Only admins can delete machine type line categories" ON public.machine_type_line_categories FOR DELETE TO authenticated USING (is_admin());

-- 3. Add line_category_id to production_lines
ALTER TABLE public.production_lines ADD COLUMN line_category_id uuid REFERENCES public.line_categories(id) ON DELETE SET NULL;
