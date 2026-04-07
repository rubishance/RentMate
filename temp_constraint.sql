ALTER TABLE public.index_bases ADD CONSTRAINT index_bases_index_type_base_period_start_key UNIQUE (index_type, base_period_start);
