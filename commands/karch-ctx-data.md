# karch-ctx-data — Database, Cache & Data Patterns

Invoke this skill when working on data access, Prisma schemas, caching, realtime, background jobs, or search.

---

## Prisma Setup & Connection Pooling

3-layer connection pool strategy — mandatory on serverless (Vercel):

```typescript
// src/lib/db.ts — singleton prevents connection storms on hot reload
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Layer 1 — Singleton**: The code above. One PrismaClient per Node.js process.

**Layer 2 — `connection_limit=1` in DATABASE_URL** (serverless mandatory):
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=1&pool_timeout=20"
```
Each serverless function has exactly 1 connection. Prevents exhausting Postgres `max_connections`.

**Layer 3 — Prisma Accelerate or PgBouncer** (production):
```
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=..."
DIRECT_URL="postgresql://..."   # used for migrations only
```
`schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // Accelerate/PgBouncer (connection pool)
  directUrl = env("DIRECT_URL")     // Direct connection (migrations)
}
```

---

## Prisma Schema Conventions

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?         // soft delete
  anonymizedAt DateTime?      // GDPR erasure (different from soft delete)

  posts     Post[]
  profile   Profile?

  @@index([email])             // always index unique-query fields
  @@index([deletedAt])         // always index soft-delete filter
}

enum Role {
  USER
  ADMIN
}
```

**Rules:**
- Always `@id @default(cuid())` — never auto-increment integers as public IDs (enumerable)
- Always `createdAt` + `updatedAt` on every model
- `deletedAt DateTime?` for soft delete; `anonymizedAt DateTime?` for GDPR erasure (never conflate)
- Explicit `@@index` on every field used in `where` clauses
- No `include: { all: true }` — always explicit `select` or `include`

---

## Data Access Patterns

### Explicit Select (mandatory for API responses)

```typescript
// Never return full Prisma objects to the client — always select
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    email: true,
    role: true,
    // password: false (implicit — never selected)
  },
})
```

### Soft Delete

```typescript
// Soft delete — set deletedAt, never destroy
await prisma.user.update({
  where: { id },
  data: { deletedAt: new Date() },
})

// All queries must filter deleted records
const users = await prisma.user.findMany({
  where: { deletedAt: null },
})
```

Consider a Prisma middleware to enforce `deletedAt: null` globally:
```typescript
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'findMany') {
    params.args.where = { ...params.args.where, deletedAt: null }
  }
  return next(params)
})
```

### GDPR Erasure (Art. 17)

```typescript
// GDPR erasure — anonymize, do not delete (preserve audit trail)
await prisma.user.update({
  where: { id },
  data: {
    email: `deleted-${id}@anon.invalid`,
    name: 'Deleted User',
    anonymizedAt: new Date(),
  },
})
```

`anonymizedAt` ≠ `deletedAt`. Soft delete hides data from the app; GDPR erasure removes PII while preserving referential integrity.

### Pagination (cursor-based — preferred over offset)

```typescript
// Cursor-based pagination — O(1) regardless of dataset size
const items = await prisma.post.findMany({
  take: 20,
  cursor: cursor ? { id: cursor } : undefined,
  skip: cursor ? 1 : 0,            // skip cursor itself
  where: { deletedAt: null },
  orderBy: { createdAt: 'desc' },
})

const nextCursor = items.length === 20 ? items[19].id : null
return { items, nextCursor }
```

Offset pagination (`skip: page * size`) is only acceptable for small datasets (<10k rows) where UX requires page numbers.

### Preventing N+1

```typescript
// BAD — N+1: 1 query for posts + N queries for authors
const posts = await prisma.post.findMany()
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } })
}

// GOOD — 2 queries total (Prisma batches the relation)
const posts = await prisma.post.findMany({
  include: { author: { select: { id: true, name: true } } },
})
```

For complex aggregations, use raw SQL via `prisma.$queryRaw`:
```typescript
const stats = await prisma.$queryRaw<{ count: bigint; avg: number }[]>`
  SELECT COUNT(*) as count, AVG(score) as avg
  FROM "Post"
  WHERE "publishedAt" > NOW() - INTERVAL '30 days'
`
```

---

## Caching Strategy

### TanStack Query (client-side)

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,        // 1 min — data considered fresh
      gcTime: 5 * 60_000,       // 5 min — unused cache kept in memory
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Usage with server-side initial data
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['posts', filters],
  queryFn: () => fetch('/api/posts').then(r => r.json()),
  initialData: serverPosts,      // from Server Component prop
})

// Optimistic update pattern
const mutation = useMutation({
  mutationFn: (data) => fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  onMutate: async (newPost) => {
    await queryClient.cancelQueries({ queryKey: ['posts'] })
    const previous = queryClient.getQueryData(['posts'])
    queryClient.setQueryData(['posts'], (old) => [...old, newPost])
    return { previous }
  },
  onError: (err, newPost, context) => {
    queryClient.setQueryData(['posts'], context.previous)
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
})
```

### Next.js ISR (server-side static cache)

```typescript
// Page-level cache: revalidate every 60 seconds
export const revalidate = 60

// Fetch-level cache: tag-based invalidation
const data = await fetch('/api/posts', {
  next: { tags: ['posts'], revalidate: 300 },
})

// On-demand revalidation (e.g., after a write)
import { revalidateTag } from 'next/cache'
revalidateTag('posts')
```

### Redis (session, rate limiting, distributed cache)

```typescript
// src/lib/redis.ts
import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()    // UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

// Cache-aside pattern
async function getCachedUser(id: string) {
  const cached = await redis.get<User>(`user:${id}`)
  if (cached) return cached

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } })
  if (user) await redis.setex(`user:${id}`, 3600, user)   // TTL: 1 hour
  return user
}

// Cache invalidation on write
async function updateUser(id: string, data: Partial<User>) {
  const user = await prisma.user.update({ where: { id }, data })
  await redis.del(`user:${id}`)        // invalidate cache
  return user
}
```

---

## Realtime

Choose the minimum capability that satisfies the use case:

| Need | Solution |
|------|----------|
| Dashboard refresh | Polling (TanStack Query `refetchInterval`) |
| Live notifications | Server-Sent Events (SSE) |
| Collaborative editing / chat | WebSockets (Pusher/Ably/Liveblocks) |

### Polling (simplest)
```typescript
useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30_000,   // every 30s
})
```

### Server-Sent Events (one-way push)
```typescript
// app/api/stream/route.ts
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(async () => {
        const data = await getLatestData()
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }, 5000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

---

## Background Jobs

### Vercel Cron (simple, scheduled)
```typescript
// app/api/cron/cleanup/route.ts
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  await prisma.user.updateMany({
    where: { deletedAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
    data: { /* anonymize fields */ },
  })

  return Response.json({ ok: true })
}
```

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }]
}
```

### Inngest (durable, event-driven, retries)
```typescript
// src/lib/inngest.ts
import { Inngest } from 'inngest'
export const inngest = new Inngest({ id: 'my-app' })

// Define a function with automatic retries
export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email', retries: 3 },
  { event: 'user/created' },
  async ({ event, step }) => {
    const user = await step.run('fetch-user', () =>
      prisma.user.findUnique({ where: { id: event.data.userId } })
    )
    await step.run('send-email', () => sendEmail(user.email, 'Welcome!'))
  }
)

// Trigger from a Server Action or Route Handler
await inngest.send({ name: 'user/created', data: { userId: user.id } })
```

---

## Full-Text Search

### pg_trgm (built-in, no extra service)
```sql
-- Enable extension (in a migration)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index for fast trigram search
CREATE INDEX CONCURRENTLY idx_posts_title_trgm ON "Post" USING GIN (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_posts_content_trgm ON "Post" USING GIN (content gin_trgm_ops);
```

```typescript
// Prisma raw query — similarity threshold 0.3
const results = await prisma.$queryRaw<Post[]>`
  SELECT id, title, similarity(title, ${query}) AS score
  FROM "Post"
  WHERE title % ${query}
    AND "deletedAt" IS NULL
  ORDER BY score DESC
  LIMIT 20
`
```

For more advanced search (facets, fuzzy, multi-language), evaluate Meilisearch or Algolia.

---

## Data Export (GDPR Art. 20)

```typescript
// app/api/users/[id]/export/route.ts
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.id !== params.id) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const data = await prisma.user.findUnique({
    where: { id: params.id },
    include: { posts: true, comments: true },
  })

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="export-${params.id}.json"`,
    },
  })
}
```
