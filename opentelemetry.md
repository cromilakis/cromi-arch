# OpenTelemetry y Distributed Tracing

Observabilidad estructurada de lo que ocurre dentro de cada request: qué funciones se ejecutaron, cuánto tardaron, qué queries dispararon, y dónde exactamente fue lento o falló.

---

## Por qué además de Sentry y Pino

Los tres sistemas son complementarios, no redundantes:

| Sistema | Qué responde |
|---------|-------------|
| **Pino** | ¿Qué eventos de negocio ocurrieron? (login, pago, error manejado) |
| **Sentry** | ¿Qué falló inesperadamente y cuál es el stack trace? |
| **OpenTelemetry** | ¿Cuánto tardó cada parte del request y dónde estuvo el cuello de botella? |

Sentry captura el *qué* de los errores. OTel captura el *cómo* y *cuánto* de la ejecución. Son herramientas distintas para preguntas distintas.

**Sin OTel**, cuando un endpoint tarda 3s, solo sabes que tardó 3s — no sabes si fue la query, el render, una llamada externa, o el middleware. **Con OTel**, ves el breakdown exacto en un flamegraph.

---

## Setup en Next.js (App Router)

Next.js 14+ tiene soporte nativo de OpenTelemetry via `instrumentation.ts`.

### Instalación

```bash
npm install @vercel/otel @opentelemetry/api
```

### Configuración

```typescript
// instrumentation.ts (en la raíz del proyecto, al nivel de app/)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');

    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'mi-app',
      // El exporter se configura via variables de entorno (ver abajo)
    });
  }
}
```

Habilitar en `next.config.ts`:

```typescript
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
};
```

### Variables de entorno

```env
# Nombre del servicio en los traces
OTEL_SERVICE_NAME=mi-app

# Endpoint del collector (según el backend elegido)
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.axiom.co
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer xaat-...,X-Axiom-Dataset=traces

# Entorno (development | preview | production)
OTEL_SERVICE_ENVIRONMENT=production
```

Agregar a `.env.example`:

```env
OTEL_SERVICE_NAME=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_HEADERS=
```

---

## Qué instrumenta Next.js automáticamente

Con `@vercel/otel`, Next.js genera spans automáticos para:

| Operación | Span generado |
|-----------|--------------|
| Route Handler (`GET /api/users`) | `http.server` |
| Server Component render | `next.render` |
| `fetch()` saliente | `http.client` |
| Prisma queries | `db.query` (con `prismaIntegration`) |
| Middleware | `next.middleware` |

Esto significa que sin ningún código adicional, cada request ya tiene un trace con sus spans internos.

---

## Spans personalizados para lógica de negocio

Para operaciones críticas que quieras medir con precisión:

```typescript
// lib/trace.ts — helper wrapper
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('mi-app');

export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      Object.entries(attributes).forEach(([k, v]) => span.setAttribute(k, v));
    }
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

```typescript
// Uso en un route handler
import { withSpan } from '@/lib/trace';

export async function POST(req: Request) {
  return withSpan('checkout.create', async () => {
    const session = await withSpan('stripe.create_session',
      () => stripe.checkout.sessions.create({ ... }),
      { 'stripe.mode': 'payment' }
    );

    await withSpan('db.create_order',
      () => prisma.order.create({ data: { ... } }),
      { 'order.items_count': items.length }
    );

    return Response.json({ data: { sessionId: session.id } });
  }, { 'user.id': userId });
}
```

---

## Atributos útiles en los spans

```typescript
// Atributos de contexto que agregan valor en los traces
span.setAttribute('user.id', session.user.id);
span.setAttribute('user.role', session.user.role);
span.setAttribute('request.id', requestId);          // correlación con Pino
span.setAttribute('db.rows_affected', result.count);
span.setAttribute('cache.hit', Boolean(cached));
span.setAttribute('integration.service', 'stripe');
span.setAttribute('integration.operation', 'create_checkout');
```

Mantener consistencia en los nombres de atributos — facilita las búsquedas en el backend de trazas.

---

## Correlación con Pino (requestId)

Para vincular un trace con sus logs de Pino, propagar el `traceId` al logger:

```typescript
// middleware.ts
import { trace } from '@opentelemetry/api';

export function middleware(request: NextRequest) {
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  const response = NextResponse.next();

  if (traceId) {
    response.headers.set('X-Trace-ID', traceId);
  }

  return response;
}
```

```typescript
// En route handlers — incluir traceId en los logs de Pino
import { trace } from '@opentelemetry/api';

export async function GET(req: Request) {
  const traceId = trace.getActiveSpan()?.spanContext().traceId;
  logger.info({ traceId, userId }, 'Fetching user orders');
}
```

Ahora en el backend de logs (Axiom, Grafana Loki) puedes ir de un log a su trace completo y viceversa.

---

## Backends de trazas

| Backend | Free tier | Integración con Vercel | Ideal para |
|---------|-----------|----------------------|-----------|
| **Vercel** (nativo) | Incluido en Pro | ✅ Sin configuración | Apps 100% en Vercel |
| **Axiom** | 500GB/mes ingestión | ✅ `@vercel/otel` | Logs + trazas unificados |
| **Grafana Cloud** | 50GB/mes | Via OTLP | Equipos con Grafana ya configurado |
| **Honeycomb** | 20M eventos/mes | Via OTLP | Análisis avanzado de trazas |
| **Jaeger** (self-hosted) | Sin límite | Via OTLP | Control total, sin costos de SaaS |

### Configuración para Vercel (más simple)

En Vercel Pro, las trazas se envían automáticamente al dashboard de Vercel Observability — sin variables de entorno adicionales. Solo activar en Project Settings → Observability.

### Configuración para Axiom

```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.axiom.co
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Bearer xaat-TOKEN,X-Axiom-Dataset=mi-app-traces
```

Axiom es la opción más práctica para proyectos independientes: unifica logs de Pino, trazas de OTel y eventos en un solo dashboard con SQL-like queries.

---

## Integración con Sentry

Sentry puede recibir trazas de OTel para enriquecer sus error reports:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');
    const { SentrySpanProcessor, SentryPropagator } = await import('@sentry/opentelemetry');

    registerOTel({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'mi-app',
      spanProcessors: [new SentrySpanProcessor()],
      textMapPropagators: [new SentryPropagator()],
    });
  }
}
```

Con esto, cuando Sentry captura un error, incluye el trace completo del request — no solo el stack trace del error aislado, sino toda la secuencia de operaciones que lo precedió.

---

## Cuándo activar OTel

No es necesario desde el día 1. Activarlo cuando:

- Los endpoints tienen latencia variable y no sabes por qué
- Hay integraciones externas (Stripe, Resend) y necesitas saber cuánto tiempo consumen
- Prisma queries lentas aparecen en logs pero no puedes correlacionarlas con el request que las generó
- El equipo escala y necesitas dar contexto completo de un bug sin reproducirlo

Para apps pequeñas con un solo desarrollador y sin problemas de latencia, Sentry + Pino son suficientes.

---

## Checklist de activación

```
[ ] instrumentation.ts creado en la raíz
[ ] experimentalInstrumentationHook: true en next.config.ts
[ ] Variables OTEL_* en Vercel → Environment Variables (production)
[ ] Backend de trazas elegido y dataset creado
[ ] withSpan aplicado a los 3-5 flujos más críticos (checkout, auth, APIs externas)
[ ] traceId propagado al logger de Pino
[ ] Dashboard de latencia configurado en el backend elegido
```

---

## Referencias

- [Logging](/logging.md) — Pino para logs; OTel para trazas; correlacionar via `traceId`
- [Sentry](/sentry.md) — integración OTel→Sentry para enriquecer error reports con el trace completo
- [Integraciones Externas](/integraciones.md) — los spans de OTel miden el tiempo real de cada llamada externa
- [Performance Budget](/performance-budget.md) — OTel revela el breakdown de latencia que Lighthouse no puede ver (server-side)
- [Health Check](/health-check.md) — el endpoint `/api/health` genera su propio span, útil para baseline de latencia
