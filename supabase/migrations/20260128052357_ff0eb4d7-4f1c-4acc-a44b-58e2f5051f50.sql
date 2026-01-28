-- Fix overly permissive policy for glossary_learning
DROP POLICY IF EXISTS "Anyone can insert glossary terms" ON public.glossary_learning;

CREATE POLICY "Authenticated users can insert glossary terms" ON public.glossary_learning
  FOR INSERT TO authenticated WITH CHECK (true);