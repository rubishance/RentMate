-- Create the private bucket for chat logs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-archives', 'chat-archives', false) 
ON CONFLICT (id) DO NOTHING;

-- Since the edge function uses the Service Role Key to save files, 
-- we don't strictly need INSERT/UPDATE policies for authenticated users.
-- But if the Admin Dashboard needs to read them later, we can add a SELECT policy for admins.

-- Create a policy that allows users to view their own Chat Logs if we ever fetch them from the client
CREATE POLICY "Users can view their own chat logs" 
ON storage.objects FOR SELECT 
TO authenticated 
USING ( bucket_id = 'chat-archives' AND auth.uid()::text = (string_to_array(name, '/'))[1] );

-- Admins can view everything
CREATE POLICY "Admins can view all chat logs" 
ON storage.objects FOR SELECT 
TO authenticated
USING ( 
    bucket_id = 'chat-archives' AND
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND (role = 'admin' OR is_super_admin = true))
);
