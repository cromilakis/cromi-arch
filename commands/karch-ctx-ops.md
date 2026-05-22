# karch-ctx-ops — Testing, Logging, Error Handling & Observability

Invoke this skill when setting up tests, configuring Pino/Sentry/OpenTelemetry, or implementing error handling.

---

## Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit / Integration | Vitest | Fast, native ESM, compatible with Next.js |
| DB integration | Prisma + SQLite (in-memory) | Real queries, no mocks, fast isolation |
| API mocking | MSW (Mock Service Worker) | Intercepts fetch, works in Node and browser |
| E2E + BDD | Playwright + `@cucumber/cucumber` | Feature files → step definitions → browser tests |
| Accessibility | `axe-playwright` | Automated WCAG 2.1 AA checks in E2E tests |
| Visual / Performance | Lighthouse CI | Performance, accessibility, SEO scores on every PR |

### Coverage Thresholds (enforced in CI)
- Lines: **80%** minimum
- Branches: **70%** minimum
- Coverage must not drop vs pre-PR baseline

---

## Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: { lines: 80, branches: 70 },
      exclude: ['node_modules', '.next', 'src/test', '**/*.d.ts', '**/*.config.*'],
    },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './msw-server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

## Database Testing (SQLite — no mocks)

```typescript
// src/test/db.ts — in-memory SQLite for integration tests
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

let prisma: PrismaClient

export function getTestPrisma() {
  if (!prisma) {
    // Point to in-memory SQLite
    process.env.DATABASE_URL = 'file::memory:?cache=shared'
    prisma = new PrismaClient()
    // Apply schema
    execSync('npx prisma db push --force-reset --skip-generate', {
      env: { ...process.env, DATABASE_URL: 'file::memory:?cache=shared' },
    })
  }
  return prisma
}

// In tests — real queries, no mocks
describe('UserRepository', () => {
  const db = getTestPrisma()

  beforeEach(async () => {
    await db.user.deleteMany()    // clean slate
  })

  it('creates a user with hashed password', async () => {
    const user = await db.user.create({ data: { email: 'test@example.com', name: 'Test' } })
    expect(user.id).toBeDefined()
    expect(user.email).toBe('test@example.com')
  })
})
```

---

## MSW — API Mocking

```typescript
// src/test/msw-handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/posts', () =>
    HttpResponse.json([{ id: '1', title: 'Test post' }])
  ),
  http.post('/api/posts', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: '2', ...body }, { status: 201 })
  }),
]

// src/test/msw-server.ts
import { setupServer } from 'msw/node'
import { handlers } from './msw-handlers'

export const server = setupServer(...handlers)
```

---

## Playwright BDD (E2E)

```
features/
  auth/
    login.feature
  posts/
    create-post.feature

src/test/e2e/
  steps/
    auth.steps.ts
    posts.steps.ts
```

```gherkin
# features/auth/login.feature
Feature: User Login
  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "user@example.com" and password "Password123"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see "Welcome back"
```

```typescript
// src/test/e2e/steps/auth.steps.ts
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

Given('I am on the login page', async function() {
  await this.page.goto('/auth/login')
})

When('I enter email {string} and password {string}', async function(email, password) {
  await this.page.getByLabel('Email').fill(email)
  await this.page.getByLabel('Password').fill(password)
})

Then('I should be redirected to the dashboard', async function() {
  await expect(this.page).toHaveURL('/dashboard')
})
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src/test/e2e',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: !process.env.CI },
})
```

### Accessibility testing in E2E
```typescript
import { checkA11y, injectAxe } from 'axe-playwright'

Then('the page should be accessible', async function() {
  await injectAxe(this.page)
  await checkA11y(this.page, undefined, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  })
})
```

---

## Error Handling (5-Layer Architecture)

```
Layer 1: Zod validation        → returns 400 with field errors
Layer 2: Route Handler try/catch → returns 500, logs to Sentry
Layer 3: TanStack Query         → surfaces error to UI via isError
Layer 4: React Error Boundary   → catches component render errors
Layer 5: Sentry                 → captures all unhandled errors
```

### Layer 1 — Zod (input boundary)
```typescript
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
}
```

### Layer 2 — Route Handler
```typescript
export async function POST(req: Request) {
  try {
    // ... business logic
    return Response.json(result, { status: 201 })
  } catch (error) {
    logger.error({ error }, 'POST /api/posts failed')
    Sentry.captureException(error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Layer 4 — Error Boundary
```typescript
// src/components/error-boundary.tsx
'use client'
import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; eventId?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    const eventId = Sentry.captureException(error, { contexts: { react: info } })
    this.setState({ eventId })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorState message="Something went wrong" />
    }
    return this.props.children
  }
}
```

---

## Pino (Structured Logging)

```typescript
// src/lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  redact: {
    paths: ['password', 'token', 'secret', 'authorization', 'cookie', '*.password', '*.token', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
})
```

**Correlation ID pattern** — tie logs to requests:
```typescript
// src/lib/correlation.ts
import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID } from 'crypto'

const storage = new AsyncLocalStorage<{ requestId: string; traceId?: string }>()

export function withCorrelation<T>(fn: () => T): T {
  return storage.run({ requestId: randomUUID() }, fn)
}

export function getCorrelation() {
  return storage.getStore() ?? {}
}

// In every Route Handler
export async function GET(req: Request) {
  return withCorrelation(async () => {
    const { requestId } = getCorrelation()
    const log = logger.child({ requestId })
    log.info({ url: req.url }, 'Incoming request')
    // ...
  })
}
```

**Log levels:**
- `debug`: detailed flow, dev only
- `info`: normal operations, all requests
- `warn`: expected errors handled gracefully (validation failures, rate limits)
- `error`: unexpected errors, always include `{ error }` object

**Never log:** passwords, tokens, cookies, credit card numbers, SSNs, full request bodies on auth endpoints.

---

## Sentry

```typescript
// src/instrumentation.ts (Next.js instrumentation hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs')
    init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      integrations: [nodeProfilingIntegration()],
    })
  }
}
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [Sentry.replayIntegration()],
})
```

**Alert thresholds** (configure in Sentry dashboard):
- Error rate > 1% → PagerDuty/Slack alert
- P95 latency > 3s → warning
- P99 latency > 10s → critical
- New error type → immediate notification

**Manual capture:**
```typescript
Sentry.captureException(error, {
  tags: { module: 'payments', action: 'charge' },
  user: { id: session.user.id },
  extra: { orderId: order.id },
})
```

---

## OpenTelemetry

```typescript
// src/instrumentation.ts — extend the register() function above
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Or use @vercel/otel (simpler, recommended on Vercel)
import { registerOTel } from '@vercel/otel'

export async function register() {
  registerOTel({ serviceName: 'my-app' })
}
```

**`withSpan` helper — trace business operations:**
```typescript
// src/lib/tracing.ts
import { trace, SpanStatusCode } from '@opentelemetry/api'

const tracer = trace.getTracer('my-app')

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number>,
  fn: () => Promise<T>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    span.setAttributes(attributes)
    try {
      const result = await fn()
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) })
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  })
}

// Usage
const post = await withSpan('post.create', { userId: session.user.id }, () =>
  prisma.post.create({ data: parsed.data })
)
```

**Correlate trace IDs with Pino logs:**
```typescript
import { trace } from '@opentelemetry/api'

const traceId = trace.getActiveSpan()?.spanContext().traceId
logger.info({ traceId, userId }, 'Post created')
```

---

## API Contract (contract-first with Zod)

Define the contract before implementation. Schemas are the single source of truth.

```typescript
// src/validations/posts.ts — shared between client and server
export const createPostSchema = z.object({ ... })
export const updatePostSchema = createPostSchema.partial()
export const postResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  author: z.object({ id: z.string(), name: z.string() }),
  createdAt: z.string().datetime(),
})

export type PostResponse = z.infer<typeof postResponseSchema>

// Validate external API responses too (API10 — Unsafe Consumption of APIs)
const externalData = postResponseSchema.parse(await externalApi.getPost(id))
```

Use the response schema to generate OpenAPI docs (via `zod-to-openapi`) and validate API contracts in integration tests.
