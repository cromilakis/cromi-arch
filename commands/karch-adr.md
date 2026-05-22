# karch-adr — Create an Architecture Decision Record

## Purpose
Document an architectural decision as an ADR (Architecture Decision Record) at the moment it is made. ADRs written weeks later lose the "why" — always write the draft immediately and complete the "Observed consequences" field in Phase 10.

## When to create an ADR

Create a draft **immediately** when deciding:
- Stack or library choice (Next.js, Prisma, Auth.js, shadcn/ui, etc.)
- New external integration (Stripe, Resend, Sentry, Supabase, etc.)
- Architecture change (folder structure, data pattern, auth strategy)
- Data strategy (migrations, soft delete, pagination, caching)
- Security decisions (rate limiting, RBAC, session management)
- Development methodology (BDD, testing strategy, commit conventions)
- **Any decision where X was chosen over Y and the reason is not obvious**

**Do NOT create an ADR for:**
- Reversible decisions with no long-term consequences
- Conventions already documented elsewhere in the playbook
- Style preferences (those belong in `estandares-diseno.md`)

## Steps

### 1. Determine the ADR number
```bash
ls docs/adr/ | sort | tail -1   # see the last number, use next
```

### 2. Create the file
Path: `docs/adr/adr-NNN-<slug>.md`
Example: `docs/adr/adr-007-use-upstash-for-rate-limiting.md`

Title format: **imperative verb** — "Use Upstash for rate limiting", not "Decision about rate limiting".

### 3. Fill the template
```markdown
# ADR-NNN: <Decision Title in Imperative>

**Status:** Draft
**Decision date:** YYYY-MM-DD
**Phase where decided:** Phase N
**Related issue:** #NNN (if applicable)

## Context

What problem or question forced this decision?
What constraints existed (time, team, compatibility, cost)?

## Options considered

### Option A — <name>
- Pro: ...
- Pro: ...
- Con: ...

### Option B — <name>
- Pro: ...
- Con: ...
- Con: ...

## Decision

**[Option X]** was chosen because [primary reason].
[Secondary reasons if applicable.]

## Expected consequences

What trade-offs are we accepting? What changes in the project?

## Observed consequences ← complete in Phase 10

Was the decision correct in practice?
What went well, what went wrong, what would we do differently?
```

### 4. Link to related code (if applicable)
If the decision has already been implemented, add a link:
```markdown
## Implementation reference
- `src/lib/rate-limit.ts` — rate limiting implementation
- `.github/workflows/ci.yml` — where the audit runs
```

### 5. Report
> "ADR-NNN created at `docs/adr/adr-NNN-<slug>.md`. Status: Draft. Observed consequences will be completed in Phase 10."

## ADR lifecycle

```
Draft          →      Accepted      →      Deprecated
(when decided)       (Phase 10,           (replaced by another
                     consequences          decision — never delete,
                     filled in)            mark as Deprecated and
                                          reference the successor)
```

## Writing rules
- **Imperative title**: "Use Prisma as ORM", not "ORM Decision"
- **Honest context**: include real constraints, not just technical ones
- **Real options**: only list options that were genuinely considered
- **No retrospective ADRs**: if the decision was made weeks ago, still write it — but note the date it was actually made, not today's date
- **Never delete a Deprecated ADR**: update status to `Deprecated` and reference the successor ADR

## Standard ADR set for a new project
These drafts should be created in the phases indicated:
```
docs/adr/
├── adr-001-stack-tecnologico.md     ← Phase 1 — Next.js + TypeScript + Prisma + PostgreSQL
├── adr-002-arquitectura-api.md      ← Phase 3 — Route Handlers vs tRPC vs GraphQL
├── adr-003-bdd-playwright.md        ← Phase 3 — Playwright BDD vs Cucumber.js
├── adr-004-error-handling.md        ← Phase 3 — Error Boundaries + TanStack Query + Sentry
├── adr-005-testing-strategy.md      ← Phase 3 — Vitest + SQLite in-memory + MSW
└── adr-006-migration-strategy.md    ← Phase 9 — Expand-contract for zero-downtime
```
