-- Allow public (anon) users to read index data for landing page
CREATE POLICY IF NOT EXISTS "Allow public read access to index data"
  ON index_data
  FOR SELECT
  TO anon
  USING (true);
