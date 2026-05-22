CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file  TEXT NOT NULL,
  section      TEXT,
  content      TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding    vector(1536),
  indexed_at   TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for vector similarity search — no retraining needed after bulk inserts
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Index for file-based lookups (sync / re-index)
CREATE INDEX IF NOT EXISTS idx_knowledge_source
  ON knowledge_chunks (source_file);
