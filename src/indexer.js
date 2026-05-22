'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getPool, closePool } = require('./db');
const { migrate } = require('./migrate');
const { chunkMarkdown } = require('./chunker');
const { embedBatch, generateTagsBatch } = require('./embedder');

const SKIP_FILES = new Set(['_sidebar.md', 'home.md', 'index.md', 'packaging.md']);
const INCLUDE_DIRS = ['decisiones', 'fases', 'references'];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function collectDocs(rootDir) {
  const docs = [];

  for (const f of fs.readdirSync(rootDir)) {
    if (!f.endsWith('.md')) continue;
    if (SKIP_FILES.has(f)) continue;
    docs.push({ filePath: path.join(rootDir, f), sourceFile: f });
  }

  for (const dir of INCLUDE_DIRS) {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const f of fs.readdirSync(dirPath)) {
      if (!f.endsWith('.md')) continue;
      docs.push({ filePath: path.join(dirPath, f), sourceFile: `${dir}/${f}` });
    }
  }

  return docs;
}

async function indexFile(pool, filePath, sourceFile, opts = {}) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileHash = sha256(content);

  if (!opts.force) {
    const existing = await pool.query(
      'SELECT content_hash FROM knowledge_chunks WHERE source_file = $1 LIMIT 1',
      [sourceFile]
    );
    if (existing.rows[0]?.content_hash === fileHash) {
      return { file: sourceFile, status: 'unchanged', chunks: 0 };
    }
  }

  await pool.query('DELETE FROM knowledge_chunks WHERE source_file = $1', [sourceFile]);

  const chunks = chunkMarkdown(content, sourceFile);
  if (chunks.length === 0) return { file: sourceFile, status: 'empty', chunks: 0 };

  // Generate embeddings and tags in parallel
  const embeddingTexts = chunks.map(c =>
    c.section ? `${c.section}\n\n${c.content}` : c.content
  );

  const [embeddings, tagsList] = await Promise.all([
    embedBatch(embeddingTexts),
    generateTagsBatch(chunks),
  ]);

  for (let i = 0; i < chunks.length; i++) {
    const { source_file, section, content: chunkContent } = chunks[i];
    const tags = tagsList[i] ?? [];

    // tsvector combines content + tags for full-text search
    const tsInput = [chunkContent, ...tags].join(' ');

    await pool.query(
      `INSERT INTO knowledge_chunks
         (source_file, section, content, content_hash, tags, embedding, content_tsv)
       VALUES
         ($1, $2, $3, $4, $5, $6::vector,
          to_tsvector('simple', $7))`,
      [
        source_file,
        section,
        chunkContent,
        fileHash,
        tags,
        JSON.stringify(embeddings[i]),
        tsInput,
      ]
    );
  }

  return { file: sourceFile, status: 'indexed', chunks: chunks.length };
}

async function indexAll(rootDir, opts = {}) {
  const pool = getPool();

  // Ensure schema is up to date before indexing
  await migrate(pool);

  const docs = collectDocs(rootDir);
  const results = [];

  for (const { filePath, sourceFile } of docs) {
    try {
      process.stdout.write(`  indexing ${sourceFile}...`);
      const result = await indexFile(pool, filePath, sourceFile, opts);
      const label = result.status === 'unchanged' ? 'skip' : `${result.chunks} chunks`;
      process.stdout.write(` ${label}\n`);
      results.push(result);
    } catch (e) {
      process.stdout.write(` ERROR: ${e.message}\n`);
      results.push({ file: sourceFile, status: 'error', error: e.message });
    }
  }

  await closePool();
  return results;
}

module.exports = { indexAll, collectDocs };
