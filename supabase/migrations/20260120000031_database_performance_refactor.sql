-- Migration: 20260120_database_performance_refactor.sql
-- Description: Adds missing indexes for foreign keys and implements RPCs for faster dashboard data retrieval.

-- ==============================================================================
-- 1. ADD MISSING INDEXES FOR PERFORMANCE
-- ==============================================================================

-- Contracts: user_id, property_id, tenant_id
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_property_id ON public.contracts(property_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON public.contracts(tenant_id);

-- Payments: user_id, contract_id, status
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON public.payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Property Documents: user_id, property_id, folder_id, category
CREATE INDEX IF NOT EXISTS idx_property_docs_user_id ON public.property_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_property_id ON public.property_documents(property_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_folder_id ON public.property_documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_property_docs_category ON public.property_documents(category);

-- Document Folders: property_id
CREATE INDEX IF NOT EXISTS idx_document_folders_property_id ON public.document_folders(property_id);

-- Short Links: user_id, created_at
CREATE INDEX IF NOT EXISTS idx_short_links_user_id ON public.short_links(user_id);
CREATE INDEX IF NOT EXISTS idx_short_links_created_at ON public.short_links(created_at);

-- ==============================================================================
-- 2. CREATE RPCS FOR AGGREGATED DATA
-- ==============================================================================

/**
 * Efficiently get counts of documents per category for a user.
 * Replaces client-side aggregation in Dashboard.
 */
CREATE OR REPLACE FUNCTION public.get_property_document_counts(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'media', COUNT(*) FILTER (WHERE category IN ('photo', 'video')),
        'utilities', COUNT(*) FILTER (WHERE category LIKE 'utility_%'),
        'maintenance', COUNT(*) FILTER (WHERE category = 'maintenance'),
        'documents', COUNT(*) FILTER (WHERE category NOT IN ('photo', 'video', 'maintenance') AND category NOT LIKE 'utility_%')
    ) INTO result
    FROM public.property_documents
    WHERE user_id = p_user_id;

    RETURN result;
END;
$$;

/**
 * Get high-level dashboard stats in a single call.
 * Including income, pending payments, and document counts.
 */
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    income_stats RECORD;
    doc_counts JSONB;
BEGIN
    -- 1. Get Income Stats
    SELECT 
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as collected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('paid', 'pending')), 0) as total
    INTO income_stats
    FROM public.payments
    WHERE user_id = p_user_id
    AND due_date >= date_trunc('month', now())
    AND due_date < date_trunc('month', now() + interval '1 month');

    -- 2. Get Document Counts (reuse RPC logic)
    doc_counts := public.get_property_document_counts(p_user_id);

    RETURN jsonb_build_object(
        'income', jsonb_build_object(
            'collected', income_stats.collected,
            'pending', income_stats.pending,
            'monthlyTotal', income_stats.total
        ),
        'storage', doc_counts,
        'timestamp', now()
    );
END;
$$;
