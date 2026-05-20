# Rate Limiting

Protege endpoints sensibles contra ataques de fuerza bruta y abuso.

## Estrategia

| Endpoint | Límite | Ventana | Bloqueo |
|---|---|---|---|
| Login / Register | 5 intentos | 15 minutos | Por IP |
| API pública | 100 req | 1 minuto | Por IP |
| API autenticada | 1000 req | 1 minuto | Por user ID |
| Password reset | 3 intentos | 1 hora | Por IP |

## Implementación con Upstash (recomendado)

Upstash Redis es gratis hasta 10K requests/día. Usamos `@upstash/ratelimit` v4.

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Sliding window es el algoritmo recomendado (evita bursts al final de la ventana)
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

// Token bucket para endpoints con burst control
export const webhookLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(100, { refillRate: 10, interval: '1 s' }),
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
      { error: 'Demasiadas solicitudes. Intenta más tarde.',
        code: 'RATE_LIMITED' },
      { status: 429, headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
      }},
    )
  }
  return null // success
}
```

## Fallback sin Upstash (Prisma + PostgreSQL)

Para piloto sin Upstash, se puede implementar rate limiting contra la base de datos local:

```typescript
// Guardar intentos en tabla rate_limits con TTL
// model RateLimit {
//   id         String   @id @default(uuid())
//   identifier String   // IP o user ID
//   endpoint   String
//   attempts   Int      @default(1)
//   windowStart DateTime
//   createdAt  DateTime @default(now())
// }

// Cron de limpieza: DELETE FROM rate_limits WHERE createdAt < NOW() - INTERVAL '1 day'
```

## Variables de entorno

```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

## Algoritmos de Rate Limiting

| Algoritmo | Uso recomendado | Ventajas | Desventajas |
|-----------|----------------|----------|-------------|
| **Sliding Window** | Login, API pública | Preciso, evita bursts al final de la ventana | Ligeramente más costoso en Redis |
| **Token Bucket** | Webhooks, bursts controlados | Permite ráfagas controladas, buen para APIs con rate limits por hora | Más complejo de configurar |
| **Fixed Window** | Solo para benchmarks | Simple, bajo costo | Permite bursts de 2x al límite al final de la ventana |

**Recomendación:** Usar `slidingWindow` como default para la mayoría de endpoints. Usar `tokenBucket` para endpoints que necesitan manejar bursts (webhooks, batch operations).

## Multi-Región con Upstash

Si la app corre en múltiples regiones (Vercel Edge), configurar Upstash con sincronización global:

```typescript
import { MultiRegionRatelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const globalLimiter = new MultiRegionRatelimit({
  redis: [
    Redis.fromEnv('UPSTASH_REDIS_US_EAST'),
    Redis.fromEnv('UPSTASH_REDIS_EU_WEST'),
  ],
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})
