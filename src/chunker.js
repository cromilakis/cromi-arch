'use strict';

const MAX_CHUNK_CHARS = 3000;

// Split a markdown file into chunks by H2 sections.
// If an H2 section is too long, split further by H3.
function chunkMarkdown(content, sourceFile) {
  const chunks = [];

  // Split on H2 boundaries
  const h2Parts = content.split(/^(?=## )/m);

  for (const part of h2Parts) {
    if (!part.trim()) continue;

    const isH2 = part.startsWith('## ');

    if (!isH2) {
      // Preamble before first H2 (file title, intro)
      const text = part.trim();
      if (text.length > 80) {
        chunks.push({ source_file: sourceFile, section: null, content: text });
      }
      continue;
    }

    const lines = part.split('\n');
    const h2Title = lines[0].replace(/^## /, '').trim();
    const body = lines.slice(1).join('\n').trim();

    if (body.length < 50) continue;

    const fullSection = `## ${h2Title}\n\n${body}`;

    if (fullSection.length <= MAX_CHUNK_CHARS) {
      chunks.push({ source_file: sourceFile, section: h2Title, content: fullSection });
      continue;
    }

    // Section too long — split by H3
    const h3Parts = body.split(/^(?=### )/m);
    let preamble = '';

    for (const sub of h3Parts) {
      if (!sub.startsWith('### ')) {
        preamble = sub.trim();
        continue;
      }

      const subLines = sub.split('\n');
      const h3Title = subLines[0].replace(/^### /, '').trim();
      const subBody = subLines.slice(1).join('\n').trim();

      if (subBody.length < 50) continue;

      const chunkContent = [
        `## ${h2Title}`,
        preamble ? `\n${preamble}` : '',
        `\n### ${h3Title}\n\n${subBody}`,
      ].filter(Boolean).join('\n').trim();

      chunks.push({
        source_file: sourceFile,
        section: `${h2Title} — ${h3Title}`,
        content: chunkContent,
      });
    }

    // If H3 splitting yielded nothing, store the section truncated
    if (chunks[chunks.length - 1]?.source_file !== sourceFile ||
        !chunks[chunks.length - 1]?.section?.startsWith(h2Title)) {
      chunks.push({
        source_file: sourceFile,
        section: h2Title,
        content: fullSection.slice(0, MAX_CHUNK_CHARS),
      });
    }
  }

  return chunks;
}

module.exports = { chunkMarkdown };
