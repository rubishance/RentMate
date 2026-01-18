-- Seed Index Bases for CPI (Consumer Price Index)
-- These are approximate factors for demonstration of the "Chained Index" logic.
-- User can update these with exact official CBS figures later.

INSERT INTO index_bases (index_type, base_period_start, base_value, chain_factor, previous_base_period_start)
VALUES
-- Base Average 2022 = 100.0 (Started Jan 2023)
('cpi', '2023-01-01', 100.0, 1.081, '2021-01-01'),

-- Base Average 2020 = 100.0 (Started Jan 2021)
('cpi', '2021-01-01', 100.0, 1.006, '2019-01-01'),

-- Base Average 2018 = 100.0 (Started Jan 2019)
('cpi', '2019-01-01', 100.0, 1.008, '2017-01-01'),

-- Example from User Image (Implicit) -> Factor 1.094
-- Let's pretend there was a base change where the factor was 1.094
('cpi', '2017-01-01', 100.0, 1.094, '2015-01-01');
