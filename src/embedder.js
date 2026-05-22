'use strict';

const { OpenAI } = require('openai');
const { getOpenAIKey } = require('./config');

let client;

function getClient() {
  if (!client) {
    const apiKey = getOpenAIKey();
    if (!apiKey) {
      throw new Error(
        'OpenAI API key not found.\n' +
        'Set it with:  npx kromi-arch config set openai-key sk-...\n' +
        'Or via env:   export OPENAI_API_KEY=sk-...'
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

// Embed a single text string → float[]
async function embed(text) {
  const res = await getClient().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // model limit
    encoding_format: 'float',
  });
  return res.data[0].embedding;
}

// Embed multiple texts in one API call → float[][]
async function embedBatch(texts) {
  const truncated = texts.map(t => t.slice(0, 8000));
  const res = await getClient().embeddings.create({
    model: 'text-embedding-3-small',
    input: truncated,
    encoding_format: 'float',
  });
  // OpenAI returns results in the same order as input
  return res.data.sort((a, b) => a.index - b.index).map(d => d.embedding);
}

// Generate keyword tags for a batch of chunks using GPT-4o-mini.
// Returns an array of string arrays, one per chunk.
async function generateTagsBatch(chunks) {
  const openai = getClient();

  // Run concurrently with a limit of 5 to avoid rate limits
  const CONCURRENCY = 5;
  const results = new Array(chunks.length);

  for (let i = 0; i < chunks.length; i += CONCURRENCY) {
    const batch = chunks.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map(({ section, content }) =>
        openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content:
              `Generate 5-8 keyword tags for this technical documentation chunk.\n` +
              `Return JSON: {"tags": ["tag1", "tag2", ...]}\n` +
              `Tags should be lowercase, specific, and capture the main topics.\n\n` +
              `Section: ${section || 'intro'}\n\n` +
              content.slice(0, 800),
          }],
          response_format: { type: 'json_object' },
          max_tokens: 80,
          temperature: 0,
        })
      )
    );

    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      if (r.status === 'fulfilled') {
        try {
          const parsed = JSON.parse(r.value.choices[0].message.content);
          results[i + j] = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [];
        } catch {
          results[i + j] = [];
        }
      } else {
        results[i + j] = [];
      }
    }
  }

  return results;
}

module.exports = { embed, embedBatch, generateTagsBatch };
