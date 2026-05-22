# Fase 7: Testing Integral

**Propósito:** Ejecutar la suite completa de tests y verificar cobertura mínima.

## Tipos de Test

| Tipo | Herramienta | Propósito |
|---|---|---|
| Unitario | Vitest + SQLite en memoria | Tests rápidos de lógica, validación Zod, helpers |
| Integración | Vitest + SQLite (Prisma push) | Test de queries a BD sin PostgreSQL real |
| BDD E2E | Playwright BDD | Tests funcionales desde el navegador |
| Accesibilidad | axe-playwright | Auditoría WCAG automatizada en tests E2E |
| Rendimiento | Lighthouse CI | Presupuesto de rendimiento por ruta |
| Smoke monitoring | Playwright | Verifica que `/api/health` responde y logging funciona |

## Stack de Mocks

**MSW (Mock Service Worker)** — intercepta peticiones HTTP en la capa de red. Funciona igual con `fetch`, `axios`, o TanStack Query.

```ts
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([{ id: 1, name: 'Test User' }])
  }),
]
```

## Performance Testing (Lighthouse CI)

Integrado como job paralelo en CI para no bloquear el pipeline principal.

```yaml
# .github/workflows/ci.yml — job lighthouse
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

Umbrales mínimos (ajustar según dominio):

| Métrica | Umbral |
|---|---|
| Performance | ≥ 85 |
| Accessibility | ≥ 90 |
| Best Practices | ≥ 90 |
| LCP | ≤ 2.5s |
| CLS | ≤ 0.1 |

## Test de Smoke de Monitoreo

El health endpoint y el logging estructurado fueron scaffoldeados en Fase 5. Aquí se verifica que funcionan correctamente antes de configurar las alertas de producción en Fase 8.

```typescript
// tests/smoke/monitoring.spec.ts
test('health endpoint responde healthy', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.status).toBe('healthy')
  expect(body.timestamp).toBeDefined()
})
```

## Cobertura Mínima

| Métrica | Mínimo |
|---|---|
| Lines | 80% |
| Functions | 70% |
| Branches | 70% |
| Statements | 80% |

## Artefactos

| Archivo | Descripción |
|---|---|
| `coverage/` | Reporte de cobertura (HTML) |
| `.lighthouse/` | Reportes de Lighthouse CI por ruta |

## Gate Humano — Condicional

- **Todos los umbrales superados** *(coverage ≥ 80% lines / 70% branches, Lighthouse Performance ≥ 85, a11y ≥ 90, health endpoint OK, 0 tests fallidos)*: el agente avanza automáticamente: *"Testing: todo verde. Coverage: X%. Lighthouse: Performance X / a11y X. Avanzando a Fase 8."*
- **Algún umbral no alcanzado**: el agente para y reporta: *"Coverage de branches en X% (mínimo 70%). Módulos sin cubrir: [lista]. ¿Ajustamos el umbral o agrego tests?"*

El humano solo interviene cuando hay un threshold roto o una decisión sobre si aceptar una excepción justificada.
