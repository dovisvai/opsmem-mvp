-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Enable uuid-ossp for uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create decisions table
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id text NOT NULL,
  user_id text,
  text text NOT NULL,
  tags text[] DEFAULT '{}',
  context jsonb,
  created_at timestamp with time zone DEFAULT now(),
  embedding vector(1536)
);

-- Create HNSW index for fast semantic search
CREATE INDEX ON public.decisions USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Create Policy: "Users can only access their workspace's decisions"
-- Note: This assumes workspace_id is stored in the user's JWT
CREATE POLICY "Users can only access their workspace's decisions"
ON public.decisions
FOR ALL
USING (workspace_id = auth.jwt()->>'workspace_id');
