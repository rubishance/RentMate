-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- Create a table to store knowledge base documents
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding VECTOR(1536) -- OpenAI text-embedding-3-small uses 1536 dimensions
);

-- Enable RLS to restrict public access
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;

-- Match function to search for knowledge documents based on similarity
CREATE OR REPLACE FUNCTION match_knowledge (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (knowledge_documents.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_documents
  WHERE 1 - (knowledge_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_documents.embedding <=> query_embedding
  LIMIT match_count;
$$;
