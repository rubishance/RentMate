-- Migration 20260403_add_performance_indexes
-- Description: Add B-Tree indexes to optimize WHERE and JOIN performance for large datasets.

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties INCLUDES (user_id);
-- Wait, INCLUDES is not strictly necessary for simple index, I'll just use standard CREATE INDEX

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties (user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON contracts (property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts (status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON contracts (tenant_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments (contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments (due_date);

CREATE INDEX IF NOT EXISTS idx_property_documents_property_id ON property_documents (property_id);
CREATE INDEX IF NOT EXISTS idx_property_protocols_property_id ON property_protocols (property_id);
