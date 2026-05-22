# karch-ctx-tools — Developer Tools & Productivity

Invoke this skill when setting up or using CodeGraph, pdfx-cli, react-doctor, or any other productivity tooling in the playbook.

---

## CodeGraph — Codebase Intelligence

CodeGraph pre-indexes the entire codebase into a SQLite graph and exposes it as an MCP server. This reduces tool calls by ~94% on large repos by making structural queries instant.

### When to use

Use CodeGraph when:
- Navigating a new or unfamiliar codebase
- Finding all callers of a function or all usages of a component
- Understanding dependency chains between modules
- Answering "where is X used?" or "what imports Y?" questions
- Any exploratory task that would otherwise require many `grep` + `read` cycles

### Installation

```bash
# Install globally (once per machine)
npm install -g codegraph

# Or via npx (no global install)
npx codegraph@latest init
```

### Commands

```bash
# Initialize the graph — run once per project
codegraph init

# Index the codebase — run after significant changes
codegraph index

# Sync index with recent changes (incremental — faster than full index)
codegraph sync

# Start the MCP server — exposes graph via Model Context Protocol
codegraph serve
# → MCP server running at http://localhost:3001/mcp
```

### MCP Integration with Claude Code

After `codegraph serve`, add to your Claude Code MCP config (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "codegraph": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

Claude can then query:
- `codegraph.findReferences(symbol)` — all usages of a function/class
- `codegraph.findDefinition(symbol)` — where something is defined
- `codegraph.getDependencyGraph(file)` — what a file imports and exports
- `codegraph.searchSymbols(query)` — fuzzy search across all symbols

### Workflow

```bash
# Start of a new coding session on a large repo
codegraph sync   # update index with any git changes
codegraph serve  # start MCP — leave running in background

# In Claude Code — now you can ask structural questions without file reads
# "Find all components that use the useAuth hook"
# "What are all the places that call prisma.user.findUnique?"
```

### SQLite graph location

```
.codegraph/
  graph.db        # SQLite database (gitignored)
  config.json     # index configuration (committed)
```

`.gitignore` entry: `.codegraph/graph.db`

---

## pdfx-cli — PDF Extraction & Processing

Command-line tool for extracting structured data from PDFs (invoices, contracts, reports).

### Installation

```bash
npm install -g pdfx-cli
# or
npx pdfx-cli@latest
```

### Commands

```bash
# Extract text from a PDF
pdfx extract invoice.pdf --output text

# Extract with structure (preserves tables, headers)
pdfx extract invoice.pdf --format structured --output json

# Extract specific pages
pdfx extract report.pdf --pages 1-5 --output text

# Batch process a directory
pdfx batch ./invoices/ --format json --output ./extracted/

# Extract and pipe to another tool
pdfx extract contract.pdf --output text | jq '.tables[0]'
```

### Integration pattern (Next.js API route)

```typescript
// app/api/documents/process/route.ts
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  if (!file || file.type !== 'application/pdf') {
    return Response.json({ error: 'Invalid file' }, { status: 400 })
  }

  const tmpPath = path.join('/tmp', `${randomUUID()}.pdf`)
  try {
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()))
    const { stdout } = await execAsync(`pdfx extract "${tmpPath}" --format structured --output json`)
    const data = JSON.parse(stdout)
    return Response.json(data)
  } finally {
    await unlink(tmpPath).catch(() => {})   // always clean up
  }
}
```

---

## react-doctor — Component Health Analysis

Analyzes React components for anti-patterns, performance issues, and accessibility violations.

### Installation

```bash
npm install -g react-doctor
# or
npx react-doctor@latest
```

### Commands

```bash
# Analyze a single component
react-doctor analyze src/components/features/dashboard/UserCard.tsx

# Analyze an entire directory
react-doctor analyze src/components/ --recursive

# Check for specific issues
react-doctor analyze src/ --checks hooks,performance,a11y

# Generate a full report
react-doctor report src/ --output docs/component-health.md

# Watch mode (re-analyzes on file changes)
react-doctor watch src/components/
```

### What it detects

| Category | Examples |
|----------|---------|
| Hook violations | Rules of Hooks violations, stale closures, missing deps in useEffect |
| Performance | Inline object/function props causing re-renders, missing `memo`/`useCallback` |
| Accessibility | Missing `alt`, `aria-label`, `role` attributes; keyboard navigation gaps |
| Anti-patterns | Direct DOM mutation, `findDOMNode`, deprecated lifecycle methods |
| Bundle size | Unoptimized imports (`import _ from 'lodash'` vs `import { debounce }`) |

### Integration in CI

```yaml
# .github/workflows/ci.yml
- name: React Doctor Analysis
  run: npx react-doctor analyze src/ --fail-on-error
```

`--fail-on-error` exits with code 1 if critical issues are found, blocking the PR.

### Pre-commit hook

```bash
# .husky/pre-commit
npx react-doctor analyze $(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx$') --fail-on-error
```

---

## Lighthouse CI

Performance, accessibility, SEO, and best practices scoring on every PR.

### Setup

```bash
npm install -D @lhci/cli
```

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000', 'http://localhost:3000/dashboard'],
      numberOfRuns: 3,
      startServerCommand: 'npm run start',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### CI integration

```yaml
- name: Lighthouse CI
  run: |
    npm run build && npm run start &
    sleep 5
    npx lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

---

## Semgrep (Static Analysis)

Security-focused static analysis. Runs in Phase 6 and full security audits.

```bash
# Run with default security rules
npx semgrep --config=auto --error

# Run on specific files
npx semgrep --config=auto --error src/app/api/

# Run a specific ruleset
npx semgrep --config=p/nextjs --error
npx semgrep --config=p/owasp-top-ten --error
```

### Custom rules (project-specific)

```yaml
# .semgrep/rules.yml
rules:
  - id: no-console-log-in-api
    patterns:
      - pattern: console.log(...)
    message: Use logger.info() instead of console.log in API routes
    languages: [typescript]
    severity: WARNING
    paths:
      include: ['src/app/api/**']
```

---

## npm-check-updates

Keep dependencies current without manual version tracking.

```bash
# See what can be updated
npx npm-check-updates

# Update only patch and minor versions (safe)
npx npm-check-updates --target minor -u && npm install

# Evaluate major upgrades separately
npx npm-check-updates --target major   # review only, don't apply
```

**Policy:**
- Patch/minor: apply immediately, run tests, commit if green
- Major: evaluate breaking changes, create a dedicated PR per major upgrade

---

## Tool Quick Reference

| Tool | Primary command | When to use |
|------|----------------|-------------|
| `codegraph` | `codegraph serve` | Any structural code navigation |
| `pdfx-cli` | `pdfx extract <file>` | PDF extraction in server routes |
| `react-doctor` | `react-doctor analyze src/` | Component health audit |
| `lhci` | `npx lhci autorun` | Performance/a11y scoring |
| `semgrep` | `npx semgrep --config=auto` | Security static analysis |
| `npm-check-updates` | `npx ncu --target minor` | Dependency maintenance |
| `prisma studio` | `npx prisma studio` | Visual DB inspection in dev |
| `prisma migrate dev` | `npx prisma migrate dev` | Apply schema changes locally |
| `prisma db push` | `npx prisma db push` | Prototype schema changes (no migration file) |
