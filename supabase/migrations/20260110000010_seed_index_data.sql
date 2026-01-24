-- Seed dummy CPI data for 2024-2025
-- Using approximate values based on recent trends (base 2022 ~105-110)

INSERT INTO index_data (index_type, date, value, source)
VALUES 
  ('cpi', '2024-01', 105.0, 'manual'),
  ('cpi', '2024-02', 105.2, 'manual'),
  ('cpi', '2024-03', 105.5, 'manual'),
  ('cpi', '2024-04', 106.0, 'manual'),
  ('cpi', '2024-05', 106.3, 'manual'),
  ('cpi', '2024-06', 106.5, 'manual'),
  ('cpi', '2024-07', 107.0, 'manual'),
  ('cpi', '2024-08', 107.2, 'manual'),
  ('cpi', '2024-09', 107.5, 'manual'),
  ('cpi', '2024-10', 107.8, 'manual'),
  ('cpi', '2024-11', 108.0, 'manual'),
  ('cpi', '2024-12', 108.2, 'manual'),
  ('cpi', '2025-01', 108.5, 'manual'),
  ('cpi', '2025-02', 108.8, 'manual'),
  ('cpi', '2025-03', 109.0, 'manual'),
  ('cpi', '2025-04', 109.3, 'manual'),
  ('cpi', '2025-05', 109.5, 'manual'),
  ('cpi', '2025-06', 109.8, 'manual'),
  ('cpi', '2025-07', 110.0, 'manual'),
  ('cpi', '2025-08', 110.2, 'manual'),
  ('cpi', '2025-09', 110.5, 'manual'),
  ('cpi', '2025-10', 110.8, 'manual'),
  ('cpi', '2025-11', 111.0, 'manual'),
  ('cpi', '2025-12', 111.2, 'manual')
ON CONFLICT (index_type, date) DO UPDATE 
SET value = EXCLUDED.value;
