'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { getPool, closePool } = require('./db');

const DUMP_PATH = path.join(__dirname, '..', 'knowledge.json.gz');

async function exportDump(outputPath = DUMP_PATH) {
  const pool = getPool();
  try {
    const { rows } = await pool.query(
      `SELECT source_file, section, content, content_hash, tags,
              embedding::text AS embedding
       FROM knowledge_chunks
       ORDER BY source_file, section NULLS FIRST`
    );

    const json = JSON.stringify(rows);
    const compressed = zlib.gzipSync(Buffer.from(json), { level: 9 });
    fs.writeFileSync(outputPath, compressed);

    return { chunks: rows.length, bytes: compressed.length };
  } finally {
    await closePool();
  }
}

async function importDump(inputPath = DUMP_PATH) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Dump not found: ${inputPath}`);
  }

  const pool = getPool();
  try {
    const { migrate } = require('./migrate');
    await migrate(pool);

    const compressed = fs.readFileSync(inputPath);
    const json = zlib.gunzipSync(compressed).toString();
    const rows = JSON.parse(json);

    // Clear existing data and restore from dump
    await pool.query('TRUNCATE TABLE knowledge_chunks');

    for (const row of rows) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      const tsInput = [row.content, ...tags].join(' ');
      await pool.query(
        `INSERT INTO knowledge_chunks
           (source_file, section, content, content_hash, tags, embedding, content_tsv)
         VALUES ($1, $2, $3, $4, $5::text[], $6::vector, to_tsvector('simple', $7))`,
        [
          row.source_file,
          row.section,
          row.content,
          row.content_hash,
          tags,
          row.embedding,
          tsInput,
        ]
      );
    }

    // Rebuild indexes after bulk insert
    await pool.query('REINDEX INDEX idx_knowledge_fts');
    // Recreate HNSW index (more reliable than REINDEX for vector indexes)
    await pool.query('DROP INDEX IF EXISTS idx_knowledge_embedding');
    await pool.query(`
      CREATE INDEX idx_knowledge_embedding
      ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
    `);

    return { chunks: rows.length };
  } finally {
    await closePool();
  }
}

module.exports = { exportDump, importDump, DUMP_PATH };
