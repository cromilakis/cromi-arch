'use strict';

const { getPool, closePool } = require('./db');
const { embed } = require('./embedder');

const RRF_K = 60;
const CANDIDATE_POOL = 30;

const STOP_WORDS = new Set([
  'de','la','el','los','las','en','con','por','para','que','un','una','es','y',
  'o','a','al','del','se','su','lo','le','me','te','si','no','ya','hay','ser',
  'como','pero','más','todo','esta','este','son','has','the','and','for','with',
  'how','what','when','where','which','from','into','about','also','this','that',
]);

function buildFtsQuery(query) {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
  return words.length > 0 ? words.join(' | ') : null;
}

async function search(query, limit = 5) {
  const pool = getPool();
  try {
    const [vector, ftsQuery] = await Promise.all([
      embed(query),
      Promise.resolve(buildFtsQuery(query)),
    ]);

    let rows;

    if (ftsQuery) {
      // Hybrid: vector + FTS via RRF
      const result = await pool.query(
        `WITH
          vector_ranked AS (
            SELECT id, source_file, section, content, tags,
              ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
            FROM knowledge_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT $3
          ),
          fts_ranked AS (
            SELECT id,
              ROW_NUMBER() OVER (
                ORDER BY ts_rank_cd(content_tsv, to_tsquery('simple', $2)) DESC
              ) AS rank
            FROM knowledge_chunks
            WHERE content_tsv @@ to_tsquery('simple', $2)
            ORDER BY ts_rank_cd(content_tsv, to_tsquery('simple', $2)) DESC
            LIMIT $3
          )
        SELECT
          v.source_file, v.section, v.content, v.tags,
          (1.0/($4 + v.rank) + COALESCE(1.0/($4 + f.rank), 0)) AS score
        FROM vector_ranked v
        LEFT JOIN fts_ranked f ON v.id = f.id
        ORDER BY score DESC
        LIMIT $5`,
        [JSON.stringify(vector), ftsQuery, CANDIDATE_POOL, RRF_K, limit]
      );
      rows = result.rows;
    } else {
      // Pure vector search fallback
      const result = await pool.query(
        `SELECT source_file, section, content, tags,
           1 - (embedding <=> $1::vector) AS score
         FROM knowledge_chunks
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [JSON.stringify(vector), limit]
      );
      rows = result.rows;
    }

    // Normalize scores relative to top result for display
    if (rows.length > 0) {
      const maxScore = rows[0].score;
      rows.forEach(r => { r.normalizedScore = maxScore > 0 ? r.score / maxScore : 0; });
    }

    return rows;
  } finally {
    await closePool();
  }
}

module.exports = { search };
