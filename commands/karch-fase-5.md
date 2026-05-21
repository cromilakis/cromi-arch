# karch-fase-5 — Implementation (RED → GREEN → REFACTOR)

## Purpose
Implement each task from Phase 4 following the full BDD cycle. The human approved the Gherkin scenarios in Phase 4 — the job here is to make them pass, nothing more.

## Prior context required
- `specs/NNN-feature/tasks.md` from Phase 4
- `docs/architecture.md` and `specs/NNN-feature/contracts/` from Phase 3

## Prerequisites (before writing the first Feature File)

### CI scaffold must be running
```yaml
# .github/workflows/ci.yml — minimum scaffold from the first commit
jobs:
  scaffold:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npx vitest run
```
This scaffold hardens in Phase 9. What is not done at the start does not get added at the end.

### Health endpoint and logging must exist before the first E2E
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const dbOk = await checkDatabaseConnection()
  return Response.json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
```

## BDD cycle per task

**Repeat for each task in `tasks.md`:**

### Step 1 — Write the Feature File (Gherkin)
```gherkin
# features/<domain>/<name>.feature
Feature: <Feature name>
  As a <actor>
  I want to <action>
  So that <value>

  Background:
    Given the database is clean

  @happy-path
  Scenario: <happy path name>
    Given <precondition>
    When <action>
    Then <expected result>

  @error
  Scenario: <error case name>
    Given <precondition>
    When <invalid action>
    Then <error response>
```

### Step 2 — Write Step Definitions that FAIL (RED)
```typescript
// features/<domain>/steps/<name>.steps.ts
import { createBdd } from 'playwright-bdd';
import { test, expect } from '../../playwright/fixtures';

const { Given, When, Then } = createBdd(test);

Given('<step text>', async ({ page }) => {
  // implementation pending — step must fail here
});
```

### Step 3 — Verify RED
```bash
npx bddgen && npx playwright test --grep "<scenario name>"
# Must fail — if it passes, the step is not testing anything
```

### Step 4 — Implement minimum code to pass (GREEN)
- Write only what is needed to make the scenarios pass
- Follow contracts from `specs/NNN-feature/contracts/`
- Apply auth pattern: `const session = await auth(); if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })`
- Apply BOLA check: `if (resource.userId !== session.user.id) return Response.json({ error: 'Forbidden' }, { status: 403 })`
- Validate all inputs with Zod — never trust raw request body

### Step 5 — Verify GREEN
```bash
npx bddgen && npx playwright test --grep "<scenario name>"
# All scenarios must pass
```

### Step 6 — REFACTOR
- Improve readability, extract helpers, remove duplication
- Tests must remain green throughout

### Step 7 — Full regression
```bash
npm test
# 100% green before committing
```

### Step 8 — Conventional commit
```bash
git add <specific files>
git commit -m "feat(<domain>): <description>"
# One commit per task — no mixed purposes
```

## Gate
**Conditional gate:**

- **All scenarios pass + regression green**: advance automatically → *"Implementation complete. X scenarios green, regression OK. Advancing to Phase 6."*
- **A scenario fails**: stop and report → *"Failed scenario: [name]. Cause: [description]. Adjust implementation or revise the scenario?"*
- **Agent made decisions outside the spec** (ambiguity resolved in a non-obvious way, scope change detected): stop and explain → *"To implement [X] I had to assume [Y]. Is that correct or should I handle it differently?"*

## Error signals
- Implementing without a Feature File first: stop, write the Feature File first
- Skipping RED verification: do not proceed to GREEN without seeing tests fail
- Test passes without implementation: the step definition is wrong — fix it before proceeding
- `npm test` regression: do not commit, fix all broken tests first
