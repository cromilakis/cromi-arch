# Fase 7: Testing Integral

**Propósito:** Ejecutar la suite completa de tests y verificar cobertura mínima.

## Tipos de Test

| Tipo | Herramienta | Propósito |
|---|---|---|
| Unitario | Vitest + SQLite en memoria | Tests rápidos de lógica, validación Zod, helpers |
| Integración | Vitest + SQLite (Prisma push) | Test de queries a BD sin PostgreSQL real |
| BDD E2E | Playwright BDD | Tests funcionales desde el navegador |
| Accesibilidad | axe-playwright | Auditoría WCAG automatizada en tests E2E |

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

## Gate Humano

> "Test results. Coverage: X%. ¿Aprobado?"

✅ El humano revisa resultados antes de pasar a Fase 8.
