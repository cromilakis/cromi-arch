# karch-phase-10 — Documentation

## Purpose
Complete and publish all documentation after implementation is final. ADRs are not created here — they were drafted in Phases 1-3 when decisions were made. Here they are completed and published.

## Prior context required
- PR merged and deployed (Phase 9 complete)
- Draft ADRs created in Phases 1-3 at `docs/adr/`
- Runbook initiated in Phase 8 at `docs/runbook.md`
- Feature files from Phase 5 (these ARE the living documentation)

## Steps

### 1. Complete ADR drafts
For each draft ADR in `docs/adr/`:
```markdown
# ADR-NNN: <Decision Title>

**Status:** Accepted
**Date:** YYYY-MM-DD

## Context
[Why this decision was needed — written at decision time in Phase 3]

## Decision
[What was decided]

## Consequences (complete this now — after implementation)
- What worked as expected
- What was harder than anticipated
- Whether the decision was correct in hindsight
- Links to the code that implements it

## Alternatives considered
[Options that were evaluated and rejected]
```

Do NOT create ADRs retrospectively for decisions that were obvious from the playbook.
Only document decisions that involved a real tradeoff or deviated from defaults.

### 2. Update README.md
```markdown
# Project Name

## Quick start
\`\`\`bash
git clone <repo>
cp .env.example .env.local   # fill in the values
npm install
npx prisma migrate dev
npm run dev
\`\`\`

## Environment variables
See `.env.example` — all required variables documented there.

## Running tests
\`\`\`bash
npm test                    # unit + integration
npx playwright test         # E2E BDD
\`\`\`

## Architecture
See `docs/architecture.md`.
```

### 3. Review and complete the runbook
Open `docs/runbook.md` (started in Phase 8) and verify:
- [ ] All 5 sections present: identify in Sentry, correlate logs, rollback, emergency migration, escalation
- [ ] Contact names/handles are real and current
- [ ] Links to Sentry project, Vercel dashboard, and DB console are correct
- [ ] Post-mortem template at the end (for future incidents)

### 4. Verify living documentation (BDD feature files)
The Gherkin feature files in `features/` ARE the living documentation — they describe system behavior in plain language and are always in sync with the code (because CI enforces they pass).

Verify:
- [ ] Every implemented scenario has a corresponding passing test
- [ ] Feature files are organized under meaningful domain folders
- [ ] Scenario names are human-readable and self-explanatory

### 5. Close the issue
```bash
gh issue close <NNN> --comment "Implemented in PR #NNN. Deployed to production."
```

## Recommended ADR set
These draft ADRs should have been created during earlier phases:
```
docs/adr/
├── adr-001-stack-tecnologico.md     ← draft: Phase 1
├── adr-002-arquitectura-api.md      ← draft: Phase 3
├── adr-003-bdd-playwright.md        ← draft: Phase 3
├── adr-004-error-handling.md        ← draft: Phase 3
├── adr-005-testing-strategy.md      ← draft: Phase 3
└── adr-006-migration-strategy.md    ← draft: Phase 9
```

## Artifacts produced
| File | Description |
|------|-------------|
| `docs/` | Complete project documentation |
| `docs/adr/` | Completed ADRs (drafted in Phases 1-3) |
| `docs/runbook.md` | Complete runbook (started in Phase 8) |
| `README.md` | Setup guide and quick start |

## Gate
**Conditional gate:**

- **Documentation complete** (all ADRs completed, README with working setup instructions, runbook reviewed): advance automatically and mark the cycle as delivered → *"Documentation complete. ADRs published, README updated, runbook finalized. Cycle complete — issue closed."*
- **Gap found**: stop and report → *"ADR-003 missing 'Consequences' field. Should I complete it based on what I observed during implementation, or do you have additional context?"*

The cycle closes automatically if everything is in order. The human only intervenes if there is a gap that requires their perspective.

## Error signals
- ADR created retrospectively for a non-decision: do not document what was obviously the only option
- README setup instructions not verified: test them in a clean environment or explicitly flag as untested
- Issue not closed after deploy: close it with a reference to the merged PR
