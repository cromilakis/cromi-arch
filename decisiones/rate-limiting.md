# Rate Limiting

Protege endpoints sensibles contra ataques de fuerza bruta y abuso. Se implementa en **Fase 6** como parte del hardening de seguridad.

## Estrategia

| Endpoint | Límite | Ventana | Bloqueo |
|---|---|---|---|
| Login / Register | 5 intentos | 15 minutos | Por IP |
| Password reset | 3 intentos | 1 hora | Por IP |
| API pública | 100 req | 1 minuto | Por IP |
| API autenticada | 1000 req | 1 minuto | Por user ID |
| Webhooks | 10 req/s burst | Token bucket | Por origen |

## Dónde aplicar

**`middleware.ts` (global)** — para endpoints que deben protegerse antes de llegar al handler:

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { apiLimiter, rateLimitCheck } from '@/lib/rate-limit'

export async function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === 'test') return NextResponse.next()

  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const response = await rateLimitCheck(ip, apiLimiter)
  if (response) return response

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
```

**Route Handler (granular)** — para endpoints con límites distintos (login, reset, webhooks):

```typescript
// src/app/api/auth/login/route.ts
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'anonymous'
  const limited = await rateLimitCheck(ip, loginLimiter)
  if (limited) return limited

  // lógica de login...
}
```

## Implementación con Upstash (recomendado)

Upstash Redis es gratis hasta 10K requests/día. Usamos `@upstash/ratelimit` v4.

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const loginLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15 m'),
  analytics: true,
  prefix: 'ratelimit:login',
})

export const apiLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
})

// Token bucket para webhooks: 10 tokens/s, máximo 100 en cola
export const webhookLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(10, '1 s', 100),
  analytics: true,
  prefix: 'ratelimit:webhook',
})

export async function rateLimitCheck(
  identifier: string,
  limiter: Ratelimit = loginLimiter,
) {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  if (!success) {
    return Response.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
        },
      },
    )
  }
  return null
}
```

## Fallback sin Upstash (Prisma + PostgreSQL)

Para piloto sin Upstash, se puede implementar rate limiting contra la base de datos local:

```typescript
// model RateLimit {
//   id          String   @id @default(uuid())
//   identifier  String
//   endpoint    String
//   attempts    Int      @default(1)
//   windowStart DateTime
//   createdAt   DateTime @default(now())
//   @@index([identifier, endpoint])
// }

// Cron de limpieza: DELETE FROM rate_limits WHERE createdAt < NOW() - INTERVAL '1 day'
```

> Usar solo en desarrollo o piloto. En producción, Upstash evita contención en la DB.

## Variables de entorno

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

Ver [Estrategia .env](/decisiones/env-strategy.md) para convenciones de nomenclatura y segmentación por entorno.

## Algoritmos

| Algoritmo | Uso recomendado | Ventajas | Desventajas |
|---|---|---|---|
| **Sliding Window** | Login, API pública | Preciso, evita bursts al límite de ventana | Ligeramente más costoso en Redis |
| **Token Bucket** | Webhooks, batch ops | Permite ráfagas controladas | Más complejo de configurar |
| **Fixed Window** | Solo benchmarks | Bajo costo | Permite bursts de 2× al final de la ventana |

**Default:** `slidingWindow` para la mayoría de endpoints. `tokenBucket` solo para webhooks y operaciones batch.

## Multi-región (Vercel Edge)

Si la app corre en múltiples regiones, configurar Upstash con sincronización global:

```typescript
import { MultiRegionRatelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const globalLimiter = new MultiRegionRatelimit({
  redis: [
    Redis.fromEnv('UPSTASH_REDIS_US_EAST'),
    Redis.fromEnv('UPSTASH_REDIS_EU_WEST'),
  ],
  limiter: MultiRegionRatelimit.slidingWindow(100, '1 m'),
})
```

## Tests

En entorno de test, el rate limiting debe desactivarse para no interferir con los escenarios BDD:

```typescript
// src/lib/rate-limit.ts
export async function rateLimitCheck(identifier: string, limiter = loginLimiter) {
  if (process.env.NODE_ENV === 'test') return null
  // ...
}
```

## Referencias

- [OWASP API Security](/owasp-api.md) — API4: Unrestricted Resource Consumption
- [Estrategia .env](/decisiones/env-strategy.md) — variables de Upstash por entorno
- [Fase 6 — Seguridad](/fases/fase-6-seguridad.md) — dónde se implementa en el flujo
