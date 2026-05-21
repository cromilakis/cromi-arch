# karch-fase-7 — Integral Testing

## Purpose
Run the complete test suite and verify all coverage thresholds. The health endpoint and Pino logging were scaffolded in Phase 5 — here they are verified before production monitoring is configured in Phase 8.

## Prior context required
- All Phase 5 implementation complete
- Phase 6 security audit passed
- CI scaffold from Phase 5 running

## Test types and execution

### Unit & Integration tests (Vitest)
```bash
npx vitest run --coverage
```
Tests: logic, Zod validation, helpers, Prisma queries (SQLite in-memory).

**Coverage thresholds (must all pass):**
| Metric | Minimum |
|--------|---------|
| Lines | 80% |
| Functions | 70% |
| Branches | 70% |
| Statements | 80% |

### E2E tests (Playwright BDD)
```bash
npx bddgen && npx playwright test
```
Runs all Feature Files from Phase 5. Every Gherkin scenario must be green.

### Accessibility (axe-playwright)
Integrated in E2E tests — runs automatically on every page visit in tests.
```typescript
// in playwright fixtures
import { injectAxe, checkA11y } from 'axe-playwright'
// checks WCAG 2.1 AA on every page
```
Target: 0 critical/serious a11y violations.

### Smoke test — monitoring infrastructure
```typescript
// tests/smoke/monitoring.spec.ts
test('health endpoint responds healthy', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.status).toBe('healthy')
  expect(body.timestamp).toBeDefined()
})
```

### Performance (Lighthouse CI)
Runs as parallel CI job — does not block the main pipeline.
```yaml
# .github/workflows/ci.yml — lighthouse job
lighthouse:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: npm ci && npm run build && npm start &
    - uses: treosh/lighthouse-ci-action@v11
      with:
        urls: |
          http://localhost:3000/
          http://localhost:3000/dashboard
        budgetPath: ./performance-budget.json
        uploadArtifacts: true
```

**Lighthouse thresholds:**
| Metric | Threshold |
|--------|-----------|
| Performance | ≥ 85 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| LCP | ≤ 2.5s |
| CLS | ≤ 0.1 |

### Mocking HTTP (MSW)
```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Test User' }])
  }),
]
```
Use MSW for external HTTP calls — never mock the database (real SQLite/Prisma in tests).

## Artifacts produced
| File | Description |
|------|-------------|
| `coverage/` | HTML coverage report |
| `.lighthouse/` | Lighthouse CI reports per route |

## Gate
**Conditional gate:**

- **All thresholds met** (coverage ≥ 80% lines / 70% branches, Lighthouse Performance ≥ 85, a11y ≥ 90, health endpoint OK, 0 failed tests): advance automatically → *"Testing: all green. Coverage: X%. Lighthouse: Performance X / a11y X. Advancing to Phase 8."*
- **Threshold not met**: stop and report → *"Branch coverage at X% (minimum 70%). Uncovered modules: [list]. Adjust threshold or add tests?"*

## Error signals
- Test passes with mocked database: remove the mock, use SQLite Prisma push instead
- Lighthouse a11y < 90: fix before proceeding — a11y is not optional
- Health endpoint returns non-200: fix before Phase 8 (monitoring depends on it)
- 0% coverage on a new module: there are missing unit tests — add them
