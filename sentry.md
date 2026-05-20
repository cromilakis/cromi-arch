# Sentry: Error Tracking y Performance

> Monitoreo de errores, rendimiento y alertas con Sentry.

## Instalación y Configuración DSN

```bash
npm install @sentry/nextjs
```

```ts
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,        // Muestreo 10% para performance
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// sentry.server.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
```

## Source Maps Upload en CI

```yaml
# .github/workflows/deploy.yml
- name: Upload Sentry source maps
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: tu-organizacion
    SENTRY_PROJECT: tu-proyecto
  run: |
    npx sentry-cli sourcemaps inject ./build
    npx sentry-cli sourcemaps upload ./build
```

## Performance Tracing

```tsx
// Medición manual de spans
import * as Sentry from '@sentry/nextjs';

export async function GET(request: Request) {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'GET /api/products',
  });

  const span = transaction.startChild({ op: 'db.query' });
  const products = await db.product.findMany();
  span.finish();

  transaction.finish();
  return Response.json(products);
}
```

## Captura Manual de Errores

```ts
import * as Sentry from '@sentry/nextjs';

try {
  await processPayment();
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'payment', user_id: userId },
    level: 'error',
  });
}
```

En Server Actions:

```ts
'use server';
import { withServerActionInstrumentation } from '@sentry/nextjs';

export async function createProduct(formData: FormData) {
  return await withServerActionInstrumentation('createProduct', async () => {
    // lógica...
  });
}
```

## Alertas

Configuradas en **sentry.io → Alerts**:

| Alerta | Condición | Acción |
|--------|-----------|--------|
| Error Rate > 1% | `event.type:error` count > 1% en 5 min | Slack + Email |
| Latencia p95 > 2s | `measurements.lcp` p95 > 2000ms | Slack |
| Crash Free Rate < 99% | Session crash rate < 99% en 1h | PagerDuty |

## Error Boundaries

```tsx
'use client';
import { ErrorBoundary } from '@sentry/nextjs';

export default function ProductPage({ children }) {
  return (
    <ErrorBoundary
      fallback={({ error }) => (
        <div>
          <h2>Algo salió mal</h2>
          <p>{error.message}</p>
          <button onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      )}
      onError={(error) => Sentry.captureException(error)}
    >
      {children}
    </ErrorBoundary>
  );
}
```
