-- Create match_decisions RPC function for semantic search
CREATE OR REPLACE FUNCTION match_decisions(
  query_embedding vector(1536),
  workspace_id text,
  match_threshold float DEFAULT 0.55,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  text text,
  tags text[],
  context jsonb,
  created_at timestamp with time zone,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.text,
    d.tags,
    d.context,
    d.created_at,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM public.decisions d
  WHERE d.workspace_id = match_decisions.workspace_id
    AND d.embedding <=> query_embedding < 1 - match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
