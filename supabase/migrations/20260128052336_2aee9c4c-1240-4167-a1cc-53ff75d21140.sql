-- SMT Ops Assistant Database Schema
-- ================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('operador', 'supervisor', 'admin');

-- 2. Create machine status enum
CREATE TYPE public.machine_status AS ENUM ('ok', 'warning', 'fault');

-- 3. Create event status enum
CREATE TYPE public.event_status AS ENUM ('open', 'in_review', 'validated', 'closed');

-- 4. Create Areas table (Plant areas/naves)
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create Production Lines table
CREATE TABLE public.production_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sequence_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create Machines table
CREATE TABLE public.machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  machine_type TEXT,
  status public.machine_status DEFAULT 'ok',
  sequence_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create Fault Types catalog
CREATE TABLE public.fault_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  keywords TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Create User Roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'operador',
  assigned_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 10. Create Event Logs table (fault reports)
CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  production_line_id UUID NOT NULL REFERENCES public.production_lines(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  fault_type_id UUID REFERENCES public.fault_types(id) ON DELETE SET NULL,
  raw_voice_text TEXT,
  ai_classified_fault TEXT,
  description TEXT,
  photo_url TEXT,
  status public.event_status DEFAULT 'open',
  supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supervisor_notes TEXT,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create Glossary Learning table (for AI training)
CREATE TABLE public.glossary_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  suggested_fault_type_id UUID REFERENCES public.fault_types(id) ON DELETE SET NULL,
  occurrences INT DEFAULT 1,
  is_mapped BOOLEAN DEFAULT false,
  mapped_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mapped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Create indexes for performance
CREATE INDEX idx_event_logs_operator ON public.event_logs(operator_id);
CREATE INDEX idx_event_logs_area ON public.event_logs(area_id);
CREATE INDEX idx_event_logs_machine ON public.event_logs(machine_id);
CREATE INDEX idx_event_logs_status ON public.event_logs(status);
CREATE INDEX idx_event_logs_created ON public.event_logs(created_at DESC);
CREATE INDEX idx_machines_line ON public.machines(production_line_id);
CREATE INDEX idx_lines_area ON public.production_lines(area_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_glossary_term ON public.glossary_learning(term);

-- 13. Create helper function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 14. Create helper functions for current user role check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'supervisor')
$$;

CREATE OR REPLACE FUNCTION public.is_operador()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'operador')
$$;

-- 15. Helper to check if supervisor oversees an area
CREATE OR REPLACE FUNCTION public.supervisor_oversees_area(_area_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() 
      AND role = 'supervisor' 
      AND assigned_area_id = _area_id
  )
$$;

-- 16. Enable RLS on all tables
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fault_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glossary_learning ENABLE ROW LEVEL SECURITY;

-- 17. RLS Policies for PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- 18. RLS Policies for USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Only admins can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete roles" ON public.user_roles
  FOR DELETE USING (public.is_admin());

-- 19. RLS Policies for AREAS
CREATE POLICY "Authenticated users can view areas" ON public.areas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert areas" ON public.areas
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update areas" ON public.areas
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete areas" ON public.areas
  FOR DELETE USING (public.is_admin());

-- 20. RLS Policies for PRODUCTION_LINES
CREATE POLICY "Authenticated users can view lines" ON public.production_lines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert lines" ON public.production_lines
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update lines" ON public.production_lines
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete lines" ON public.production_lines
  FOR DELETE USING (public.is_admin());

-- 21. RLS Policies for MACHINES
CREATE POLICY "Authenticated users can view machines" ON public.machines
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can insert machines" ON public.machines
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update machines" ON public.machines
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete machines" ON public.machines
  FOR DELETE USING (public.is_admin());

-- 22. RLS Policies for FAULT_TYPES
CREATE POLICY "Authenticated users can view fault types" ON public.fault_types
  FOR SELECT TO authenticated USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can insert fault types" ON public.fault_types
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update fault types" ON public.fault_types
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete fault types" ON public.fault_types
  FOR DELETE USING (public.is_admin());

-- 23. RLS Policies for EVENT_LOGS
CREATE POLICY "Users can view relevant logs" ON public.event_logs
  FOR SELECT USING (
    operator_id = auth.uid() 
    OR public.supervisor_oversees_area(area_id) 
    OR public.is_admin()
  );

CREATE POLICY "Operators can create logs" ON public.event_logs
  FOR INSERT WITH CHECK (operator_id = auth.uid());

CREATE POLICY "Users can update logs" ON public.event_logs
  FOR UPDATE USING (
    (operator_id = auth.uid() AND status = 'open')
    OR public.supervisor_oversees_area(area_id)
    OR public.is_admin()
  );

CREATE POLICY "Only admins can delete logs" ON public.event_logs
  FOR DELETE USING (public.is_admin());

-- 24. RLS Policies for GLOSSARY_LEARNING
CREATE POLICY "Only admins can view glossary" ON public.glossary_learning
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Anyone can insert glossary terms" ON public.glossary_learning
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can update glossary" ON public.glossary_learning
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Only admins can delete glossary" ON public.glossary_learning
  FOR DELETE USING (public.is_admin());

-- 25. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 26. Apply updated_at triggers
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lines_updated_at BEFORE UPDATE ON public.production_lines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machines_updated_at BEFORE UPDATE ON public.machines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fault_types_updated_at BEFORE UPDATE ON public.fault_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_logs_updated_at BEFORE UPDATE ON public.event_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_glossary_updated_at BEFORE UPDATE ON public.glossary_learning
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 27. Trigger to update machine status when fault is reported
CREATE OR REPLACE FUNCTION public.update_machine_status_on_fault()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' THEN
    UPDATE public.machines SET status = 'fault' WHERE id = NEW.machine_id;
  ELSIF NEW.status = 'closed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.event_logs 
      WHERE machine_id = NEW.machine_id 
        AND status IN ('open', 'in_review') 
        AND id != NEW.id
    ) THEN
      UPDATE public.machines SET status = 'ok' WHERE id = NEW.machine_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_machine_on_fault
  AFTER INSERT OR UPDATE OF status ON public.event_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_machine_status_on_fault();

-- 28. Function to handle new user signup (create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 29. Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 30. Create storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence-photos', 'evidence-photos', true);

-- 31. Storage policies for evidence photos
CREATE POLICY "Authenticated users can upload photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence-photos');

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'evidence-photos');