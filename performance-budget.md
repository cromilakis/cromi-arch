# Performance Budget

Metas concretas de rendimiento, monitoreo y prevención de regresiones.

## Budget Targets

| Categoría               | Métrica                        | Target        | Pass/Fail          |
|------------------------|--------------------------------|---------------|--------------------|
| **Bundle JS**          | Total JS (gzip)                | ≤ 180 KB      | > 180 KB → fail    |
| **Bundle CSS**         | Total CSS (gzip)               | ≤ 20 KB       | > 20 KB → fail     |
| **API — Lectura**      | P50 latencia                   | ≤ 200 ms      | > 200 ms → warn    |
| **API — Escritura**    | P95 latencia                   | ≤ 1000 ms     | > 1000 ms → fail   |
| **Lighthouse**         | Performance score (mobile)     | ≥ 90          | < 90 → fail        |
| **Lighthouse**         | Accessibility score            | ≥ 95          | < 95 → fail        |
| **Lighthouse**         | Best Practices score           | ≥ 90          | < 90 → fail        |
| **Lighthouse**         | SEO score                      | ≥ 95          | < 95 → fail        |
| **LCP**                | Largest Contentful Paint       | ≤ 2.5 s       | > 2.5 s → fail     |
| **CLS**                | Cumulative Layout Shift        | ≤ 0.1         | > 0.1 → fail       |
| **INP**                | Interaction to Next Paint      | ≤ 200 ms      | > 200 ms → warn    |
| **TBT**                | Total Blocking Time            | ≤ 200 ms      | > 200 ms → fail    |

## Bundle Analysis

Usamos `@next/bundle-analyzer` para inspeccionar el tamaño de los bundles:

```typescript
// next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
```

Ejecutar:

```bash
ANALYZE=true npm run build
# Genera reporte en .next/analyze/
```

Reglas:

- Cada página debe tener bundle JS < 50 KB (gzip)
- Cualquier dependencia > 10 KB debe justificarse en code review
- Separar vendor chunks con `experimental.optimizePackageImports`

## Monitoreo de Latencia API en Sentry

```typescript
// lib/sentry-monitor.ts
import * as Sentry from '@sentry/nextjs';

export async function withLatencyMonitoring<T>(
  label: string,
  fn: () => Promise<T>,
  budget: { warnMs: number; failMs: number },
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    Sentry.metrics.distribution('api.latency', duration, {
      unit: 'milliseconds',
      tags: { endpoint: label },
    });

    if (duration > budget.failMs) {
      Sentry.captureMessage(`API latency exceeded budget: ${label}`, {
        level: 'error',
        extra: { duration, budget: budget.failMs },
      });
    } else if (duration > budget.warnMs) {
      Sentry.captureMessage(`API latency warning: ${label}`, {
        level: 'warning',
        extra: { duration, budget: budget.warnMs },
      });
    }
  }
}
```

## Lighthouse CI en GitHub Actions

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v12
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/productos
          budgetPath: ./lighthouse-budget.json
          uploadArtifacts: true
```

Archivo de budget para Lighthouse CI:

```json
// lighthouse-budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "maxNumericValue": 2000 },
      { "metric": "largest-contentful-paint", "maxNumericValue": 2500 },
      { "metric": "cumulative-layout-shift", "maxNumericValue": 0.1 },
      { "metric": "total-blocking-time", "maxNumericValue": 200 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "maxNumericValue": 180 },
      { "resourceType": "stylesheet", "maxNumericValue": 20 }
    ]
  }
]
```

## Revisiones Periódicas

| Frecuencia | Acción                              | Responsable       |
|------------|-------------------------------------|-------------------|
| Cada PR    | Lighthouse CI + bundle diff         | CI automático     |
| Semanal    | Revisar métricas en Sentry Dashboard | Tech Lead         |
| Mensual    | Auditoría completa de performance   | Equipo de front   |
| Pre-release | Test de carga con k6               | QA / DevOps       |

Comandos útiles:

```bash
# Ver tamaño de bundles
npx next-bundle-visualizer

# Simular Lighthouse local
npx lighthouse http://localhost:3000 --view

# Medir FCP/LCP desde CLI
npx sitespeed.io http://localhost:3000 --plugins.add analysisSticky
```
