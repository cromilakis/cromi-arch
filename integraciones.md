# Patrón de Integraciones con Terceros

Estrategia unificada para conectar con servicios externos: Stripe, Resend, Supabase, etc.

## Patrón Unificado de Integración

Todas las llamadas externas usan un wrapper común:

```typescript
// lib/integrations/client.ts
interface IntegrationOptions {
  service: string;
  operation: string;
  timeoutMs: number;
  retries: number;
  cacheTtlMs?: number;
}

export async function integrationCall<T>(
  options: IntegrationOptions,
  fn: () => Promise<T>,
): Promise<T> {
  const { service, operation, timeoutMs, retries } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await withTimeout(fn(), timeoutMs);
      return result;
    } catch (error) {
      if (attempt <= retries) {
        // Exponential backoff con jitter (±25%) para evitar thundering herd
        const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        const jitter = baseDelay * (0.75 + Math.random() * 0.5);
        await sleep(jitter);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Integration failed: ${service}.${operation}`);
}
```

## Timeout por Servicio

| Servicio  | Timeout  | Retries | Backoff inicial |
|-----------|----------|---------|-----------------|
| Stripe    | 10 s     | 3       | 1 s             |
| Resend    | 15 s     | 3       | 1 s             |
| Supabase  | 5 s      | 2       | 500 ms          |
| Google    | 5 s      | 2       | 500 ms          |
| OpenAI    | 30 s     | 2       | 2 s             |

```typescript
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout: ${ms}ms`)), ms),
  );
  return Promise.race([promise, timeout]);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

## Circuit Breaker para Servicios Críticos

Implementamos circuit breaker para Stripe y Resend — servicios sin los cuales la app no funciona:

```typescript
// lib/integrations/circuit-breaker.ts
type CircuitState = 'closed' | 'open' | 'half-open';

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private readonly threshold = 5;     // fallos antes de abrir
  private readonly resetTimeout = 30_000; // 30s para half-open
  private lastFailureTime = 0;

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        console.error(`Circuit breaker OPEN for service`);
      }
      throw error;
    }
  }
}

export const stripeCircuitBreaker = new CircuitBreaker();
export const resendCircuitBreaker = new CircuitBreaker();
```

## Cacheo de Respuestas de APIs Externas

Respuestas GET a servicios externos se cachean para evitar llamadas repetitivas:

```typescript
// lib/integrations/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function cachedIntegrationCall<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fn();
  await redis.set(key, fresh, { px: ttlMs });
  return fresh;
}
```

## Degradación Graceful

Cuando un servicio externo falla, la app debe degradar sin romperse:

```typescript
// Ejemplo: Stripe checkout falla, mostramos error amigable
export async function getStripePrices() {
  try {
    return await stripeCircuitBreaker.call(() =>
      integrationCall(
        { service: 'stripe', operation: 'listPrices', timeoutMs: 10_000, retries: 3 },
        () => stripe.prices.list({ active: true }),
      ),
    );
  } catch (error) {
    Sentry.captureException(error, { tags: { service: 'stripe' } });
    // Degradación: mostrar precios cacheados o mensaje offline
    return { data: [], error: 'Servicio de pagos no disponible temporalmente' };
  }
}
```

## Monitoreo: Alertas en Fallos de Integración

Cada fallo de integración se reporta a Sentry con metadata:

```typescript
import * as Sentry from '@sentry/nextjs';

export function reportIntegrationFailure(
  service: string,
  operation: string,
  error: unknown,
  attempt: number,
) {
  Sentry.captureException(error, {
    tags: { service, operation },
    extra: { attempt },
    level: attempt > 1 ? 'error' : 'warning',
  });
}
```

Alertas configuradas en Sentry:

| Condición                              | Canal      | Respuesta                 |
|----------------------------------------|------------|---------------------------|
| > 10 fallos en 5 min (cualquier servicio) | Slack #ops | On-call investiga        |
| Circuit breaker OPEN                   | PagerDuty  | Incidente crítico         |
| Latencia P95 > 2x del timeout configurado | Slack #eng | Revisar rate limits      |
