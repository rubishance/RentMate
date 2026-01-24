-- Allow public (anon) users to read index data for landing page
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'index_data' 
        AND policyname = 'Allow public read access to index data'
    ) THEN
        CREATE POLICY "Allow public read access to index data"
          ON index_data
          FOR SELECT
          TO anon
          USING (true);
    END IF;
END $$;
