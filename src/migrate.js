'use strict';

// Runs safe ALTER TABLE migrations on the existing DB.
// Called automatically before every index run.

async function migrate(pool) {
  // Add tags column if not present
  await pool.query(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS tags TEXT[]
  `);

  // Add tsvector column for full-text search if not present
  await pool.query(`
    ALTER TABLE knowledge_chunks
    ADD COLUMN IF NOT EXISTS content_tsv tsvector
  `);

  // GIN index for full-text search
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_fts
    ON knowledge_chunks USING GIN (content_tsv)
  `);

  // HNSW index for vector search — replace ivfflat if it exists
  await pool.query(`DROP INDEX IF EXISTS idx_knowledge_embedding`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
    ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
  `);
}

module.exports = { migrate };
