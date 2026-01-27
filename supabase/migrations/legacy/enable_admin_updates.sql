-- Enable RLS just in case
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow Admins to UPDATE any profile
CREATE POLICY "Admins can update all profiles" 
ON public.user_profiles 
FOR UPDATE 
USING (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);
