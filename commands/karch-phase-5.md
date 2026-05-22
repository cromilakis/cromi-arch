# karch-phase-5 — Implementation (RED → GREEN → REFACTOR)

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

> **Hard rule — non-negotiable**: the Feature File for each task MUST be created and tests must be in RED before a single line of implementation code is written. If the Feature File path from `tasks.md` does not exist on disk, create it now. Do not skip to Step 4 under any circumstance.

> **Playground-first — non-negotiable**: before writing any JSX in a page or layout, apply the `/karch-playground` decision flow. If a component does not exist in the playground, create it there first. Raw HTML presentation elements (`h1`, `button`, `p`, `input`, etc.) are never written directly in pages — only playground primitives are used.

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

### Step 7 — Local CI gate (mandatory before every commit)

Run the full local CI suite in this exact order. All must pass — do not commit if any fails:

```bash
# 1. Type check — zero TypeScript errors
npx tsc --noEmit

# 2. Lint — zero ESLint errors or warnings
npm run lint

# 3. Unit tests — all green
npx vitest run

# 4. Build — production build must succeed
npm run build

# 5. Security scan — zero high/critical findings
npx semgrep --config auto src/ --error
```

Pre-commit hooks (Husky + lint-staged) run automatically on `git commit` and will catch lint and format issues. The local CI gate above runs the full suite **before** attempting the commit.

If any step fails: fix it before proceeding. Do not skip, ignore warnings, or use `--no-verify`.

### Step 8 — Conventional commit
```bash
git add <specific files>
git commit -m "feat(<domain>): <description>"
# One commit per task — no mixed purposes
```

## next-intl [locale] routing — mandatory checks when i18n is configured

If the project uses `[locale]` routing with next-intl, the following three issues MUST be handled whenever modifying routing, navigation, or layouts:

### A — `usePathname()` returns locale-prefixed paths
`usePathname()` from `next/navigation` returns `/es/ruta`. Any active-state check using `pathname.startsWith("/ruta")` will silently break. Replace all such comparisons with the `usePathname` from `next-intl/navigation` (created via `createNavigation`), which strips the locale prefix automatically.

```bash
# Grep before and after any routing change
grep -r "usePathname" src/ --include="*.tsx" --include="*.ts"
grep -r 'startsWith("/' src/ --include="*.tsx"
```

### B — `next/link` is not locale-aware
`<Link href="/ruta">` from `next/link` does not inject the current locale. Replace ALL imports of `Link` from `next/link` with the locale-aware `Link` exported by `createNavigation` from next-intl.

```bash
# Find all Link imports from next/link and update them
grep -r "from 'next/link'" src/ --include="*.tsx" --include="*.ts"
grep -r 'from "next/link"' src/ --include="*.tsx" --include="*.ts"
```

Every file in the output must be updated — not just the new files created in this task.

### C — Layouts and pages must receive `params: Promise<{locale: string}>` and call `setRequestLocale`
Any layout or page under the `[locale]` segment that lacks this call falls back to dynamic rendering.

```bash
# Find all layouts/pages that may be missing it
grep -rL "setRequestLocale" src/app/\[locale\]/ --include="*.tsx"
```

Update every file in the output. Stub pages with hardcoded text must also have their text replaced with `t('key')` i18n calls at this point.

### D — Auth.js middleware must not be replaced by next-intl middleware
When adding `createIntlMiddleware` to `middleware.ts` (or `proxy.ts`), combine both middlewares in chain — never replace one with the other. The pattern:

```typescript
// middleware.ts
import NextAuth from 'next-auth'
import createIntlMiddleware from 'next-intl/middleware'
import { authConfig } from './auth.config'

const intlMiddleware = createIntlMiddleware({ locales, defaultLocale })
const { auth } = NextAuth(authConfig)

export default auth(async (req) => {
  const response = intlMiddleware(req)
  return response
})

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
```

Before completing any task that touches `middleware.ts`: verify that both auth route protection and locale routing are still active.

## Gate
**Conditional gate:**

- **All scenarios pass + regression green**: advance automatically → *"Implementation complete. X scenarios green, regression OK. Advancing to Phase 6."*
- **A scenario fails**: stop and report → *"Failed scenario: [name]. Cause: [description]. Adjust implementation or revise the scenario?"*
- **Agent made decisions outside the spec** (ambiguity resolved in a non-obvious way, scope change detected): stop and explain → *"To implement [X] I had to assume [Y]. Is that correct or should I handle it differently?"*

## Error signals
- Implementing without a Feature File first: **stop immediately**, write the Feature File first — this is non-negotiable
- Skipping RED verification: do not proceed to GREEN without seeing tests fail — passing without RED means the test is not testing anything
- Test passes without implementation: the step definition is wrong — fix it before proceeding
- Any local CI step failing before commit: fix it — do not commit with a broken build, type errors, or lint warnings
- `--no-verify` on git commit: never — if the hook fails, fix the underlying issue
- Replacing `middleware.ts` auth logic with intl logic: this removes route protection silently — always combine both
- Using `next/link` or `next/navigation` `usePathname` in a `[locale]` project: grep the entire `src/` and fix every occurrence before closing the task
