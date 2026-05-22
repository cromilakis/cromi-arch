# karch-ctx-security — Security, Auth & Privacy Patterns

Invoke this skill when implementing authentication, authorization, rate limiting, input validation, or GDPR compliance.

---

## Authentication (Auth.js v5)

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Email/password
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
        if (!user?.password) return null
        const valid = await bcrypt.compare(parsed.data.password, user.password)
        return valid ? user : null
      },
    }),
    // OAuth
    Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }),
  ],
  session: { strategy: 'jwt' },   // database sessions with PrismaAdapter, or JWT for stateless
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
})
```

Session access in Server Components and Route Handlers:
```typescript
const session = await auth()
if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
```

---

## Authorization Pattern (BOLA Prevention)

Every resource endpoint must verify ownership — authentication alone is insufficient.

```typescript
// app/api/posts/[id]/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  // 1. Authentication
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Fetch resource
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, content: true, authorId: true },
  })
  if (!post) return Response.json({ error: 'Not found' }, { status: 404 })

  // 3. BOLA check — verify ownership (or admin override)
  if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  return Response.json(post)
}
```

**Rule**: Every `findUnique` by ID must be followed by an ownership check. No exceptions.

---

## RBAC (Role-Based Access Control)

```typescript
// src/lib/rbac.ts
type Role = 'USER' | 'ADMIN' | 'MODERATOR'

const permissions: Record<Role, string[]> = {
  USER: ['post:read', 'post:create', 'post:update:own', 'post:delete:own'],
  MODERATOR: ['post:read', 'post:create', 'post:update:own', 'post:delete:own', 'post:delete:any'],
  ADMIN: ['*'],
}

export function can(role: Role, action: string): boolean {
  const perms = permissions[role]
  return perms.includes('*') || perms.includes(action)
}

// Usage in Route Handler
if (!can(session.user.role, 'post:delete:any')) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

## Input Validation (Zod — mandatory on all inputs)

```typescript
// src/validations/post.ts
import { z } from 'zod'

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(50_000),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export type CreatePostInput = z.infer<typeof createPostSchema>

// Route Handler — always validate before touching the DB
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = createPostSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const post = await prisma.post.create({
    data: { ...parsed.data, authorId: session.user.id },
  })
  return Response.json(post, { status: 201 })
}
```

**Rule**: Every `req.json()` call must be followed by a Zod `safeParse`. Never use `parse` (throws) in route handlers — always `safeParse` and return 400.

---

## Rate Limiting (Upstash Redis + Ratelimit)

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()

// Predefined limiters — choose by endpoint sensitivity
export const rateLimiters = {
  // Auth endpoints: 5 attempts per 15 minutes per IP
  auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '15 m'), prefix: 'rl:auth' }),
  // Public API: 100 requests per minute per IP
  public: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'), prefix: 'rl:public' }),
  // Authenticated API: 1000 per minute per user
  api: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1000, '1 m'), prefix: 'rl:api' }),
  // Sensitive business flows (payment, vote, transfer): 10 per hour per user
  sensitive: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:sensitive' }),
}

// Helper — use in any Route Handler
export async function rateLimitCheck(
  limiter: Ratelimit,
  identifier: string
): Promise<Response | null> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  if (!success) {
    return Response.json(
      { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(reset),
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    )
  }
  return null
}

// Usage
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const limited = await rateLimitCheck(rateLimiters.auth, ip)
  if (limited) return limited
  // ... rest of handler
}
```

**Thresholds summary:**
- Login/Register/Password reset: **5 req / 15 min per IP**
- All public GET endpoints: **100 req / min per IP**
- Authenticated endpoints: **1000 req / min per user ID**
- Sensitive business actions: **10 req / hour per user ID**

---

## Security Headers (next.config.ts)

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // narrow this in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
} satisfies NextConfig
```

---

## Password Handling

```typescript
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12   // minimum; 14 for high-value accounts

// Hash on register
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS)

// Verify on login — timing-safe comparison built into bcrypt
const valid = await bcrypt.compare(plainPassword, hashedPassword)

// Never log, return, or select password fields
const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, name: true, role: true },   // no password field
})
```

---

## GDPR / Privacy Compliance

### PII Inventory (document in schema)
```prisma
model User {
  // PII fields — covered by GDPR Art.4
  email        String    @unique   // PII
  name         String?             // PII
  phone        String?             // PII (sensitive)
  address      Json?               // PII (sensitive)
  // Non-PII
  id           String    @id @default(cuid())
  role         Role      @default(USER)
  createdAt    DateTime  @default(now())
  deletedAt    DateTime?           // soft delete
  anonymizedAt DateTime?           // GDPR Art.17 erasure
}
```

### Art. 17 — Right to Erasure
```typescript
async function gdprErase(userId: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anon.invalid`,
        name: null,
        phone: null,
        address: null,
        anonymizedAt: new Date(),
      },
    }),
    // Anonymize related PII in other tables
    prisma.comment.updateMany({
      where: { authorId: userId },
      data: { authorName: 'Deleted User' },
    }),
  ])
}
```

### Art. 7 — Consent Storage
```prisma
model Consent {
  id        String   @id @default(cuid())
  userId    String
  purpose   String   // 'marketing', 'analytics', etc.
  version   String   // consent policy version
  givenAt   DateTime @default(now())
  revokedAt DateTime?

  user User @relation(fields: [userId], references: [id])
  @@index([userId, purpose])
}
```

### Art. 20 — Data Portability
Always provide a `/api/users/[id]/export` endpoint for apps that collect personal data. See `karch-ctx-data` for the implementation pattern.

---

## Secret Management

**Rules:**
- All secrets in `.env.local` (gitignored) — never in code or `environment` config files
- `.env.example` documents all required variables without values
- Use Vercel Environment Variables for production (not `.env.production`)
- Rotate secrets via Vercel dashboard without code changes

```bash
# Required variables (document in .env.example)
DATABASE_URL=                    # connection string with connection_limit=1
DIRECT_URL=                      # direct Postgres URL for migrations
NEXTAUTH_URL=                    # full public URL
NEXTAUTH_SECRET=                 # openssl rand -base64 32
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
CRON_SECRET=                     # openssl rand -base64 32
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Secret scanning check:
```bash
# Run before every PR
grep -r --include="*.ts" --include="*.tsx" --include="*.js" \
  -E "(password|secret|token|apiKey)\s*=\s*['\"][^'\"]{8,}" . \
  --exclude-dir=node_modules --exclude-dir=.git
```

---

## OWASP API Top 10 Checklist

| Risk | Mitigation |
|------|-----------|
| API1 — Broken Object Level Auth | BOLA check on every resource endpoint (ownership verification) |
| API2 — Broken Auth | Auth.js v5 + JWT, no custom session logic |
| API3 — Broken Object Property Level Auth | Explicit `select` on all Prisma queries, Zod schema on all inputs |
| API4 — Unrestricted Resource Consumption | Rate limiting on all endpoints, pagination with `take` limit |
| API5 — Broken Function Level Auth | RBAC check on all admin/privileged routes |
| API6 — Unrestricted Access to Sensitive Business Flows | Strict rate limits on business flows (10/hr), idempotency keys |
| API7 — Server-Side Request Forgery | Validate all URLs, allowlist external domains, never proxy arbitrary URLs |
| API8 — Security Misconfiguration | Security headers, no stack traces in responses, Pino `redact` |
| API9 — Improper Inventory Management | Document all public endpoints; flag intentionally public in code comments |
| API10 — Unsafe Consumption of APIs | Validate all external API responses with Zod before using |
